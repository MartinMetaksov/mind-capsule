import { Id } from "@/core/common/id";
import { Vertex } from "@/core/vertex";
import { Workspace } from "@/core/workspace";
import type { FileSystem, ImageEntry, ImageMetadata, NoteEntry, UrlEntry } from "../fileSystem";
import { Store } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";
import { readDir, readFile, remove, writeFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

const WORKSPACE_KEY_PREFIX = "ws-";
const VERTEX_KEY_PREFIX = "vert-";
const KEY_SUFFIX = ".json";
const IMAGE_META_FILE = "images.meta.json";
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"];
const URLS_FILE = "urls.json";
const NOTE_EXTENSION = ".md";

type WorkspaceMap = Record<Id, Workspace>;
type VertexMap = Record<Id, Vertex>;

let store: Store | null = null;
let workspaces: WorkspaceMap = {};
let vertices: VertexMap = {};
let loadPromise: Promise<void> | null = null;

async function initStore(): Promise<Store> {
  if (store) return store;
  store = await Store.load("settings.json");
  return store;
}

async function persist(key: string, value: unknown) {
  const activeStore = await initStore();
  await activeStore.set(key, value);
  await activeStore.save();
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

async function readUrlsFile(dir: string): Promise<UrlEntry[]> {
  const urlsPath = await join(dir, URLS_FILE);
  try {
    const raw = await readFile(urlsPath);
    const text = new TextDecoder().decode(raw);
    const parsed = JSON.parse(text) as UrlEntry[] | { links?: UrlEntry[] } | null;
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.links)) return parsed.links;
  } catch {
    await ensureUrlsFile(dir);
  }
  return [];
}

async function writeUrlsFile(dir: string, links: UrlEntry[]): Promise<void> {
  const urlsPath = await join(dir, URLS_FILE);
  const encoded = new TextEncoder().encode(JSON.stringify(links, null, 2));
  await writeFile(urlsPath, encoded);
}

async function ensureUrlsFile(dir: string): Promise<void> {
  try {
    const entries = await readDir(dir);
    const exists = entries.some((entry) => entry.name === URLS_FILE);
    if (!exists) {
      await writeUrlsFile(dir, []);
    }
  } catch {
    // ignore missing/invalid directory
  }
}

async function loadMetadata<T>(activeStore: Store, prefix: string): Promise<Record<Id, T>> {
  const map: Record<Id, T> = {};
  const keys = await activeStore.keys();
  for (const key of keys) {
    const id = parseMetadataId(prefix, key);
    if (!id) continue;
    const value = await activeStore.get<T>(key);
    if (value) {
      map[id] = value;
    }
  }
  return map;
}

async function ensureLoaded() {
  if (loadPromise) {
    await loadPromise;
    return;
  }
  loadPromise = (async () => {
    const activeStore = await initStore();
    workspaces = await loadMetadata<Workspace>(activeStore, WORKSPACE_KEY_PREFIX);
    vertices = await loadMetadata<Vertex>(activeStore, VERTEX_KEY_PREFIX);
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
  })();
  await loadPromise;
}

export const fileSystem: FileSystem = {
  async createWorkspace(workspace: Workspace): Promise<void> {
    await ensureLoaded();
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
    await ensureLoaded();
    return Object.values(workspaces);
  },
  async getWorkspace(workspace_id: Id): Promise<Workspace | null> {
    await ensureLoaded();
    return workspaces[workspace_id] ?? null;
  },
  async updateWorkspace(new_workspace: Workspace): Promise<void> {
    await ensureLoaded();
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
    await ensureLoaded();
    const workspace = workspaces[workspace_id];
    if (!workspace) {
      throw new Error(`Workspace ${workspace_id} does not exist.`);
    }
    await invoke("fs_remove_workspace", { workspacePath: workspace.path });
    const activeStore = await initStore();
    for (const vertex of Object.values(vertices)) {
      if (vertex.workspace_id === workspace_id) {
        delete vertices[vertex.id];
        await activeStore.delete(vertexKey(vertex.id));
      }
    }
    delete workspaces[workspace_id];
    await activeStore.delete(workspaceKey(workspace_id));
    await activeStore.save();
  },
  async createVertex(vertex: Vertex): Promise<void> {
    await ensureLoaded();
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
    await ensureUrlsFile(assetDirectory);
    await persist(vertexKey(vertex.id), vertices[vertex.id]);
  },
  async getVertices(parent_id: Id): Promise<Vertex[]> {
    await ensureLoaded();
    return Object.values(vertices).filter((v) => v.parent_id === parent_id);
  },
  async getAllVertices(): Promise<Vertex[]> {
    await ensureLoaded();
    return Object.values(vertices);
  },
  async getWorkspaceRootVertices(workspace_id: Id): Promise<Vertex[]> {
    await ensureLoaded();
    return Object.values(vertices).filter(
      (v) => v.parent_id == null
    ).filter((v) => v.workspace_id === workspace_id);
  },
  async getVertex(vertex_id: Id): Promise<Vertex | null> {
    await ensureLoaded();
    return vertices[vertex_id] ?? null;
  },
  async updateVertex(new_vertex: Vertex): Promise<void> {
    await ensureLoaded();
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
    await ensureLoaded();
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
    const activeStore = await initStore();
    await activeStore.delete(vertexKey(new_vertex.id));
    await activeStore.save();
  },

  /* ===== Images ===== */

  async listImages(vertex: Vertex): Promise<ImageEntry[]> {
    await ensureLoaded();
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
    await ensureLoaded();
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
    await ensureLoaded();
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
    await ensureLoaded();
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
    await ensureLoaded();
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
    await ensureLoaded();
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
    await ensureLoaded();
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
    await ensureLoaded();
    const dir = vertex.asset_directory;
    const name = createNoteName();
    const filePath = await join(dir, name);
    const encoded = new TextEncoder().encode(text);
    await writeFile(filePath, encoded);
    return { name, text };
  },

  async deleteNote(vertex: Vertex, name: string): Promise<void> {
    await ensureLoaded();
    const dir = vertex.asset_directory;
    const filePath = await join(dir, name);
    await remove(filePath);
  },

  async updateNote(vertex: Vertex, name: string, text: string): Promise<NoteEntry | null> {
    await ensureLoaded();
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

  /* ===== Links ===== */

  async listLinks(vertex: Vertex): Promise<UrlEntry[]> {
    await ensureLoaded();
    const dir = vertex.asset_directory;
    return readUrlsFile(dir);
  },

  async getLink(vertex: Vertex, id: string): Promise<UrlEntry | null> {
    await ensureLoaded();
    const dir = vertex.asset_directory;
    const links = await readUrlsFile(dir);
    const match = links.find((link) => link.id === id);
    return match ?? null;
  },

  async createLink(
    vertex: Vertex,
    link: Omit<UrlEntry, "id">
  ): Promise<UrlEntry> {
    await ensureLoaded();
    const dir = vertex.asset_directory;
    const links = await readUrlsFile(dir);
    const entry: UrlEntry = {
      id: crypto.randomUUID(),
      url: link.url,
      title: link.title,
    };
    await writeUrlsFile(dir, [...links, entry]);
    return entry;
  },

  async deleteLink(vertex: Vertex, id: string): Promise<void> {
    await ensureLoaded();
    const dir = vertex.asset_directory;
    const links = await readUrlsFile(dir);
    await writeUrlsFile(
      dir,
      links.filter((link) => link.id !== id)
    );
  },

  async updateLink(
    vertex: Vertex,
    id: string,
    link: Omit<UrlEntry, "id">
  ): Promise<UrlEntry | null> {
    await ensureLoaded();
    const dir = vertex.asset_directory;
    const links = await readUrlsFile(dir);
    const idx = links.findIndex((entry) => entry.id === id);
    if (idx === -1) return null;
    const updated: UrlEntry = { id, url: link.url, title: link.title };
    const next = links.map((entry, i) => (i === idx ? updated : entry));
    await writeUrlsFile(dir, next);
    return updated;
  },
};
