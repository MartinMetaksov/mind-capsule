import { Id } from "@/core/common/id";
import { Vertex } from "@/core/vertex";
import { Workspace } from "@/core/workspace";
import type { FileSystem, ImageEntry, ImageMetadata, NoteEntry } from "../fileSystem";
import { Store } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";
import { readDir, readFile, remove, writeFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

const store = await Store.load("settings.json");

const WORKSPACE_KEY_PREFIX = "ws-";
const VERTEX_KEY_PREFIX = "vert-";
const KEY_SUFFIX = ".json";
const IMAGE_META_FILE = "images.meta.json";
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"];
const NOTE_EXTENSION = ".md";

type WorkspaceMap = Record<Id, Workspace>;
type VertexMap = Record<Id, Vertex>;

async function persist(key: string, value: unknown) {
  await store.set(key, value);
  await store.save();
}

function workspaceKey(id: Id): string {
  return `${WORKSPACE_KEY_PREFIX}${id}${KEY_SUFFIX}`;
}

function vertexKey(id: Id): string {
  return `${VERTEX_KEY_PREFIX}${id}${KEY_SUFFIX}`;
}

function resolveWorkspaceId(vertex: Vertex): Id | null {
  if (vertex.workspace_id) return vertex.workspace_id;
  let cursor: Vertex | undefined = vertex;
  while (cursor?.parent_id) {
    const parent: Vertex = vertices[cursor.parent_id];
    if (!parent) return null;
    if (parent.workspace_id) return parent.workspace_id;
    cursor = parent;
  }
  return null;
}

function parseMetadataId(prefix: string, key: string): Id | null {
  if (!key.startsWith(prefix) || !key.endsWith(KEY_SUFFIX)) return null;
  const id = key.slice(prefix.length, -KEY_SUFFIX.length);
  return id || null;
}

function buildAssetDirectory(workspacePath: string, vertexId: Id): string {
  const trimmed = workspacePath.replace(/[\\/]+$/, "");
  return `${trimmed}/${vertexId}`;
}

function pickImageExtension(file: File): string {
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;
  const type = file.type?.toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "png";
}

function createImageName(file: File): string {
  const ext = pickImageExtension(file);
  return `${crypto.randomUUID()}.${ext}`;
}

function getImageExtension(name: string): string | null {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return null;
  return name.slice(idx + 1).toLowerCase();
}

function isImageFile(name: string): boolean {
  const ext = getImageExtension(name);
  if (!ext) return false;
  return IMAGE_EXTENSIONS.includes(`.${ext}`);
}

function mimeForExtension(ext: string | null): string {
  if (!ext) return "application/octet-stream";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function isNoteFile(name: string): boolean {
  return name.toLowerCase().endsWith(NOTE_EXTENSION);
}

function sanitizeNoteName(name: string): string {
  return name.replace(/[^\w.-]+/g, "-");
}

function createNoteName(): string {
  const stamp = new Date().toISOString().replace(/[:]/g, "-");
  return sanitizeNoteName(`note-${stamp}${NOTE_EXTENSION}`);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function toDataUrl(bytes: Uint8Array, name: string): string {
  const ext = getImageExtension(name);
  const mime = mimeForExtension(ext);
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

type ImageMetaFile = {
  images: Record<string, ImageMetadata>;
};

async function readImageMeta(dir: string): Promise<ImageMetaFile> {
  const metaPath = await join(dir, IMAGE_META_FILE);
  try {
    const raw = await readFile(metaPath);
    const text = new TextDecoder().decode(raw);
    const parsed = JSON.parse(text) as ImageMetaFile | null;
    if (parsed && typeof parsed === "object" && parsed.images) {
      return { images: parsed.images ?? {} };
    }
  } catch {
    // ignore missing/invalid metadata
  }
  return { images: {} };
}

async function writeImageMeta(dir: string, meta: ImageMetaFile): Promise<void> {
  const metaPath = await join(dir, IMAGE_META_FILE);
  const encoded = new TextEncoder().encode(JSON.stringify(meta, null, 2));
  await writeFile(metaPath, encoded);
}

async function loadMetadata<T>(prefix: string): Promise<Record<Id, T>> {
  const map: Record<Id, T> = {};
  const keys = await store.keys();
  for (const key of keys) {
    const id = parseMetadataId(prefix, key);
    if (!id) continue;
    const value = await store.get<T>(key);
    if (value) {
      map[id] = value;
    }
  }
  return map;
}

const workspaces: WorkspaceMap = await loadMetadata<Workspace>(WORKSPACE_KEY_PREFIX);
const vertices: VertexMap = await loadMetadata<Vertex>(VERTEX_KEY_PREFIX);

Object.values(vertices).forEach((vertex) => {
  if (!vertex.asset_directory) {
    const workspaceId = resolveWorkspaceId(vertex);
    const workspace = workspaceId ? workspaces[workspaceId] : null;
    vertex.asset_directory = workspace
      ? buildAssetDirectory(workspace.path, vertex.id)
      : "";
    vertex.is_corrupt = true;
  }
});

export const fileSystem: FileSystem = {
  async createWorkspace(workspace: Workspace): Promise<void> {
    if (workspaces[workspace.id]) {
      throw new Error(`Workspace ${workspace.id} already exists.`);
    }
    const now = new Date().toISOString();
    workspaces[workspace.id] = {
      ...workspace,
      created_at: workspace.created_at ?? now,
      updated_at: workspace.updated_at ?? now,
    };
    await invoke("fs_create_workspace", { workspacePath: workspaces[workspace.id].path });
    await persist(workspaceKey(workspace.id), workspaces[workspace.id]);
  },
  async selectWorkspaceDirectory(): Promise<string | null> {
    try {
      // Placeholder command; to be implemented in the Tauri side.
      const dir = await invoke<string | null>("fs_pick_workspace_dir");
      return dir ?? null;
    } catch {
      return null;
    }
  },
  async getWorkspaces(): Promise<Workspace[]> {
    return Object.values(workspaces);
  },
  async getWorkspace(workspace_id: Id): Promise<Workspace | null> {
    return workspaces[workspace_id] ?? null;
  },
  async updateWorkspace(new_workspace: Workspace): Promise<void> {
    if (!workspaces[new_workspace.id]) {
      throw new Error(`Workspace ${new_workspace.id} does not exist.`);
    }
    workspaces[new_workspace.id] = {
      ...new_workspace,
      updated_at: new Date().toISOString(),
    };
    await invoke("fs_update_workspace", { workspacePath: workspaces[new_workspace.id].path });
    await persist(workspaceKey(new_workspace.id), workspaces[new_workspace.id]);
  },
  async removeWorkspace(workspace_id: Id): Promise<void> {
    const workspace = workspaces[workspace_id];
    if (!workspace) {
      throw new Error(`Workspace ${workspace_id} does not exist.`);
    }
    await invoke("fs_remove_workspace", { workspacePath: workspace.path });
    for (const vertex of Object.values(vertices)) {
      if (vertex.workspace_id === workspace_id) {
        delete vertices[vertex.id];
        await store.delete(vertexKey(vertex.id));
      }
    }
    delete workspaces[workspace_id];
    await store.delete(workspaceKey(workspace_id));
    await store.save();
  },
  async createVertex(vertex: Vertex): Promise<void> {
    const workspaceId = resolveWorkspaceId(vertex);
    if (!workspaceId) {
      throw new Error("Vertex is missing workspace_id.");
    }
    const workspace = workspaces[workspaceId];
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} does not exist.`);
    }
    const now = new Date().toISOString();
    const assetDirectory = buildAssetDirectory(workspace.path, vertex.id);
    vertices[vertex.id] = {
      ...vertex,
      asset_directory: assetDirectory,
      created_at: vertex.created_at ?? now,
      updated_at: vertex.updated_at ?? now,
    };
    await invoke("fs_create_vertex_dir", {
      workspacePath: workspace.path,
      vertexId: vertex.id,
    });
    await persist(vertexKey(vertex.id), vertices[vertex.id]);
  },
  async getVertices(parent_id: Id): Promise<Vertex[]> {
    return Object.values(vertices).filter((v) => v.parent_id === parent_id);
  },
  async getAllVertices(): Promise<Vertex[]> {
    return Object.values(vertices);
  },
  async getWorkspaceRootVertices(workspace_id: Id): Promise<Vertex[]> {
    return Object.values(vertices).filter(
      (v) => v.parent_id == null
    ).filter((v) => v.workspace_id === workspace_id);
  },
  async getVertex(vertex_id: Id): Promise<Vertex | null> {
    return vertices[vertex_id] ?? null;
  },
  async updateVertex(new_vertex: Vertex): Promise<void> {
    if (!vertices[new_vertex.id]) {
      throw new Error(`Vertex ${new_vertex.id} does not exist.`);
    }
    const assetDirectory =
      new_vertex.asset_directory || vertices[new_vertex.id]?.asset_directory;
    vertices[new_vertex.id] = {
      ...new_vertex,
      asset_directory: assetDirectory ?? "",
      is_corrupt: assetDirectory ? new_vertex.is_corrupt : true,
      updated_at: new Date().toISOString(),
    };
    await persist(vertexKey(new_vertex.id), vertices[new_vertex.id]);
  },
  async removeVertex(new_vertex: Vertex): Promise<void> {
    const workspaceId = resolveWorkspaceId(new_vertex);
    if (!workspaceId) {
      throw new Error("Vertex is missing workspace_id.");
    }
    const workspace = workspaces[workspaceId];
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} does not exist.`);
    }
    await invoke("fs_remove_vertex_dir", {
      workspacePath: workspace.path,
      vertexId: new_vertex.id,
    });
    delete vertices[new_vertex.id];
    await store.delete(vertexKey(new_vertex.id));
    await store.save();
  },

  /* ===== Images ===== */

  async listImages(vertex: Vertex): Promise<ImageEntry[]> {
    const dir = vertex.asset_directory;
    const meta = await readImageMeta(dir);
    const entries = await readDir(dir);
    const results: ImageEntry[] = [];
    for (const entry of entries) {
      if (!entry.name) continue;
      if (!isImageFile(entry.name)) continue;
      const filePath = await join(dir, entry.name);
      try {
        const data = await readFile(filePath);
        results.push({
          name: entry.name,
          path: toDataUrl(data, entry.name),
          ...(meta.images[entry.name] ?? {}),
        });
      } catch {
        // skip entries that cannot be read
      }
    }
    return results;
  },

  async getImage(vertex: Vertex, name: string): Promise<ImageEntry | null> {
    const dir = vertex.asset_directory;
    const meta = await readImageMeta(dir);
    const filePath = await join(dir, name);
    try {
      const data = await readFile(filePath);
      return {
        name,
        path: toDataUrl(data, name),
        ...(meta.images[name] ?? {}),
      };
    } catch {
      return null;
    }
  },

  async createImage(vertex: Vertex, file: File): Promise<ImageEntry> {
    const dir = vertex.asset_directory;
    const name = createImageName(file);
    const filePath = await join(dir, name);
    const data = new Uint8Array(await file.arrayBuffer());
    await writeFile(filePath, data);
    return {
      name,
      path: toDataUrl(data, name),
    };
  },

  async deleteImage(vertex: Vertex, name: string): Promise<void> {
    const dir = vertex.asset_directory;
    const meta = await readImageMeta(dir);
    const filePath = await join(dir, name);
    await remove(filePath);
    delete meta.images[name];
    await writeImageMeta(dir, meta);
  },

  async updateImageMetadata(
    vertex: Vertex,
    name: string,
    metadata: ImageMetadata
  ): Promise<ImageEntry | null> {
    const dir = vertex.asset_directory;
    const meta = await readImageMeta(dir);
    const filePath = await join(dir, name);
    const next = {
      alt: metadata.alt?.trim() || undefined,
      description: metadata.description?.trim() || undefined,
    };
    if (!next.alt && !next.description) {
      delete meta.images[name];
    } else {
      meta.images[name] = next;
    }
    await writeImageMeta(dir, meta);
    try {
      const data = await readFile(filePath);
      return {
        name,
        path: toDataUrl(data, name),
        ...(meta.images[name] ?? {}),
      };
    } catch {
      return null;
    }
  },

  /* ===== Notes ===== */

  async listNotes(vertex: Vertex): Promise<NoteEntry[]> {
    const dir = vertex.asset_directory;
    const entries = await readDir(dir);
    const results: NoteEntry[] = [];
    for (const entry of entries) {
      if (!entry.name) continue;
      if (!isNoteFile(entry.name)) continue;
      const filePath = await join(dir, entry.name);
      try {
        const data = await readFile(filePath);
        const text = new TextDecoder().decode(data);
        results.push({ name: entry.name, text });
      } catch {
        // skip entries that cannot be read
      }
    }
    results.sort((a, b) => a.name.localeCompare(b.name));
    return results;
  },

  async getNote(vertex: Vertex, name: string): Promise<NoteEntry | null> {
    const dir = vertex.asset_directory;
    const filePath = await join(dir, name);
    try {
      const data = await readFile(filePath);
      const text = new TextDecoder().decode(data);
      return { name, text };
    } catch {
      return null;
    }
  },

  async createNote(vertex: Vertex, text: string): Promise<NoteEntry> {
    const dir = vertex.asset_directory;
    const name = createNoteName();
    const filePath = await join(dir, name);
    const encoded = new TextEncoder().encode(text);
    await writeFile(filePath, encoded);
    return { name, text };
  },

  async deleteNote(vertex: Vertex, name: string): Promise<void> {
    const dir = vertex.asset_directory;
    const filePath = await join(dir, name);
    await remove(filePath);
  },

  async updateNote(vertex: Vertex, name: string, text: string): Promise<NoteEntry | null> {
    const dir = vertex.asset_directory;
    const filePath = await join(dir, name);
    try {
      const encoded = new TextEncoder().encode(text);
      await writeFile(filePath, encoded);
      return { name, text };
    } catch {
      return null;
    }
  },
};
