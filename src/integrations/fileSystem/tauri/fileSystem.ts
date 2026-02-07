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
const WORKSPACE_INDEX_KEY = "workspaces.index.json";
const WORKSPACE_DATA_FILE = "mind-capsule.workspace.json";
const WORKSPACE_DATA_VERSION = 2;
const IMAGE_META_FILE = "images.meta.json";
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"];
const URLS_FILE = "urls.json";
const NOTE_EXTENSION = ".md";

type WorkspaceMap = Record<Id, Workspace>;
type VertexMap = Record<Id, Vertex>;
type WorkspaceIndexEntry = Workspace;
type StoredVertex = Omit<Vertex, "asset_directory" | "workspace_id">;
type WorkspaceDataFile = {
  version: number;
  vertices: Record<Id, StoredVertex>;
};

let store: Store | null = null;
let workspaceIndex: WorkspaceIndexEntry[] = [];
let workspaces: WorkspaceMap = {};
let vertices: VertexMap = {};
let loadPromise: Promise<void> | null = null;

async function initStore(): Promise<Store> {
  if (store) return store;
  store = await Store.load("settings.json");
  return store;
}

function resolveWorkspaceIdFromMap(vertex: Vertex, map: VertexMap): Id | null {
  if (vertex.workspace_id) return vertex.workspace_id;
  let cursor: Vertex | undefined = vertex;
  while (cursor?.parent_id) {
    const parent: Vertex = map[cursor.parent_id];
    if (!parent) return null;
    if (parent.workspace_id) return parent.workspace_id;
    cursor = parent;
  }
  return null;
}

function resolveWorkspaceId(vertex: Vertex): Id | null {
  return resolveWorkspaceIdFromMap(vertex, vertices);
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

function inferWorkspaceNameFromPath(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? "Workspace";
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

type WorkspaceDataParseResult = {
  data: WorkspaceDataFile;
  legacyWorkspace?: Workspace;
  isLegacyFormat: boolean;
};

async function readWorkspaceDataFile(
  workspacePath: string
): Promise<WorkspaceDataParseResult | null> {
  const dataPath = await join(workspacePath, WORKSPACE_DATA_FILE);
  try {
    const raw = await readFile(dataPath);
    const text = new TextDecoder().decode(raw);
    const parsed = JSON.parse(text) as
      | WorkspaceDataFile
      | { workspace?: Workspace; vertices?: Record<Id, StoredVertex> }
      | null;
    if (parsed && typeof parsed === "object") {
      if ("vertices" in parsed && parsed.vertices && typeof parsed.vertices === "object") {
        if ("workspace" in parsed && parsed.workspace) {
          return {
            data: {
              version: WORKSPACE_DATA_VERSION,
              vertices: parsed.vertices,
            },
            legacyWorkspace: parsed.workspace,
            isLegacyFormat: true,
          };
        }
        return {
          data: {
            version:
              typeof (parsed as WorkspaceDataFile).version === "number"
                ? (parsed as WorkspaceDataFile).version
                : WORKSPACE_DATA_VERSION,
            vertices: parsed.vertices,
          },
          isLegacyFormat: false,
        };
      }
    }
  } catch {
    // ignore missing/invalid data file
  }
  return null;
}

async function writeWorkspaceDataFile(
  workspacePath: string,
  data: WorkspaceDataFile
): Promise<void> {
  const dataPath = await join(workspacePath, WORKSPACE_DATA_FILE);
  const encoded = new TextEncoder().encode(JSON.stringify(data, null, 2));
  await writeFile(dataPath, encoded);
}

function hydrateVerticesForWorkspace(
  workspace: Workspace,
  source: Record<Id, StoredVertex>
): Record<Id, Vertex> {
  const normalized: Record<Id, Vertex> = {};
  Object.values(source).forEach((stored) => {
    const assetDirectory = buildAssetDirectory(workspace.path, stored.id);
    const next: Vertex = {
      ...stored,
      asset_directory: assetDirectory,
      workspace_id: workspace.id,
      is_corrupt: assetDirectory ? stored.is_corrupt : true,
    };
    normalized[stored.id] = next;
  });
  return normalized;
}

function filterVerticesForWorkspace(
  workspace: Workspace,
  source: VertexMap
): Record<Id, Vertex> {
  const selected: Record<Id, Vertex> = {};
  Object.values(source).forEach((vertex) => {
    const resolvedWorkspaceId = resolveWorkspaceIdFromMap(vertex, source);
    if (resolvedWorkspaceId === workspace.id) {
      selected[vertex.id] = vertex;
    }
  });
  return selected;
}

async function loadWorkspaceIndex(
  activeStore: Store,
  legacyWorkspaces: WorkspaceMap
): Promise<WorkspaceIndexEntry[]> {
  const stored = await activeStore.get<WorkspaceIndexEntry[]>(WORKSPACE_INDEX_KEY);
  const now = new Date().toISOString();
  if (Array.isArray(stored)) {
    const normalized = stored
      .map((entry) => {
        if (!entry?.id || !entry?.path) return null;
        return {
          id: entry.id,
          name: entry.name ?? inferWorkspaceNameFromPath(entry.path),
          path: entry.path,
          created_at: entry.created_at ?? now,
          updated_at: entry.updated_at ?? now,
          tags: entry.tags ?? [],
        } as WorkspaceIndexEntry;
      })
      .filter(Boolean) as WorkspaceIndexEntry[];
    await activeStore.set(WORKSPACE_INDEX_KEY, normalized);
    await activeStore.save();
    return normalized;
  }
  const index = Object.values(legacyWorkspaces).map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    path: workspace.path,
    created_at: workspace.created_at,
    updated_at: workspace.updated_at,
    tags: workspace.tags ?? [],
  }));
  await activeStore.set(WORKSPACE_INDEX_KEY, index);
  await activeStore.save();
  return index;
}

function serializeWorkspaceVertices(
  workspaceId: Id,
  source: VertexMap
): Record<Id, StoredVertex> {
  const stored: Record<Id, StoredVertex> = {};
  Object.values(source).forEach((vertex) => {
    if (vertex.workspace_id !== workspaceId) return;
    const { asset_directory, workspace_id, ...rest } = vertex;
    void asset_directory;
    void workspace_id;
    stored[vertex.id] = rest;
  });
  return stored;
}

async function persistWorkspaceIndex(): Promise<void> {
  const activeStore = await initStore();
  await activeStore.set(WORKSPACE_INDEX_KEY, workspaceIndex);
  await activeStore.save();
}

async function persistWorkspaceData(workspaceId: Id): Promise<void> {
  const workspace = workspaces[workspaceId];
  if (!workspace) return;
  const data: WorkspaceDataFile = {
    version: WORKSPACE_DATA_VERSION,
    vertices: serializeWorkspaceVertices(workspaceId, vertices),
  };
  await writeWorkspaceDataFile(workspace.path, data);
}

async function cleanupLegacyStore(
  activeStore: Store,
  legacyWorkspaces: WorkspaceMap,
  legacyVertices: VertexMap
): Promise<void> {
  const keys = await activeStore.keys();
  let updated = false;
  for (const key of keys) {
    if (parseMetadataId(WORKSPACE_KEY_PREFIX, key) && legacyWorkspaces) {
      await activeStore.delete(key);
      updated = true;
    }
    if (parseMetadataId(VERTEX_KEY_PREFIX, key) && legacyVertices) {
      await activeStore.delete(key);
      updated = true;
    }
  }
  if (updated) {
    await activeStore.save();
  }
}

async function ensureLoaded() {
  if (loadPromise) {
    await loadPromise;
    return;
  }
  loadPromise = (async () => {
    const activeStore = await initStore();
    const legacyWorkspaces = await loadMetadata<Workspace>(activeStore, WORKSPACE_KEY_PREFIX);
    const legacyVertices = await loadMetadata<Vertex>(activeStore, VERTEX_KEY_PREFIX);
    workspaceIndex = await loadWorkspaceIndex(activeStore, legacyWorkspaces);
    workspaces = {};
    vertices = {};

    for (const entry of workspaceIndex) {
      const legacyWorkspace = legacyWorkspaces[entry.id];
      const workspace: Workspace = legacyWorkspace
        ? { ...legacyWorkspace, path: entry.path, name: entry.name ?? legacyWorkspace.name }
        : entry;

      workspaces[workspace.id] = workspace;

      const fromFile = await readWorkspaceDataFile(entry.path);
      if (fromFile) {
        const hydrated = hydrateVerticesForWorkspace(workspace, fromFile.data.vertices);
        Object.values(hydrated).forEach((vertex) => {
          vertices[vertex.id] = vertex;
        });
        if (fromFile.isLegacyFormat || fromFile.data.version !== WORKSPACE_DATA_VERSION) {
          await persistWorkspaceData(workspace.id);
        }
        continue;
      }

      const selected = filterVerticesForWorkspace(workspace, legacyVertices);
      if (Object.keys(selected).length > 0) {
        Object.values(selected).forEach((vertex) => {
          vertices[vertex.id] = {
            ...vertex,
            workspace_id: workspace.id,
            asset_directory: buildAssetDirectory(workspace.path, vertex.id),
          };
        });
      }
      await persistWorkspaceData(workspace.id);
    }

    const hasLegacy =
      Object.keys(legacyWorkspaces).length > 0 ||
      Object.keys(legacyVertices).length > 0;
    if (hasLegacy) {
      await cleanupLegacyStore(activeStore, legacyWorkspaces, legacyVertices);
    }
  })();
  await loadPromise;
}

async function pruneMissingWorkspaces(): Promise<{ workspaces: number; vertices: number }> {
  await ensureLoaded();
  const missing: Workspace[] = [];

  for (const workspace of Object.values(workspaces)) {
    try {
      await readDir(workspace.path);
    } catch {
      missing.push(workspace);
    }
  }

  if (missing.length === 0) {
    return { workspaces: 0, vertices: 0 };
  }

  let removedVertices = 0;
  for (const workspace of missing) {
    delete workspaces[workspace.id];
    workspaceIndex = workspaceIndex.filter((entry) => entry.id !== workspace.id);
    for (const vertex of Object.values(vertices)) {
      if (vertex.workspace_id !== workspace.id) continue;
      delete vertices[vertex.id];
      removedVertices += 1;
    }
  }

  await persistWorkspaceIndex();
  return { workspaces: missing.length, vertices: removedVertices };
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
    workspaceIndex = [
      ...workspaceIndex.filter((entry) => entry.id !== workspace.id),
      workspaces[workspace.id],
    ];
    await persistWorkspaceIndex();
    const fromFile = await readWorkspaceDataFile(workspaces[workspace.id].path);
    if (fromFile) {
      const hydrated = hydrateVerticesForWorkspace(
        workspaces[workspace.id],
        fromFile.data.vertices
      );
      Object.values(hydrated).forEach((vertex) => {
        vertices[vertex.id] = vertex;
      });
      if (fromFile.isLegacyFormat || fromFile.data.version !== WORKSPACE_DATA_VERSION) {
        await persistWorkspaceData(workspace.id);
      }
      return;
    }
    await persistWorkspaceData(workspace.id);
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
    const previous = workspaces[new_workspace.id];
    workspaces[new_workspace.id] = {
      ...previous,
      ...new_workspace,
      updated_at: new Date().toISOString(),
    };
    if (previous.path !== workspaces[new_workspace.id].path) {
      Object.values(vertices).forEach((vertex) => {
        if (vertex.workspace_id !== new_workspace.id) return;
        vertex.asset_directory = buildAssetDirectory(
          workspaces[new_workspace.id].path,
          vertex.id
        );
      });
    }
    workspaceIndex = workspaceIndex.map((entry) =>
      entry.id === new_workspace.id
        ? workspaces[new_workspace.id]
        : entry
    );
    await invoke("fs_update_workspace", { workspacePath: workspaces[new_workspace.id].path });
    await persistWorkspaceIndex();
    await persistWorkspaceData(new_workspace.id);
  },
  async removeWorkspace(workspace_id: Id): Promise<void> {
    await ensureLoaded();
    const workspace = workspaces[workspace_id];
    if (!workspace) {
      throw new Error(`Workspace ${workspace_id} does not exist.`);
    }
    for (const vertex of Object.values(vertices)) {
      if (vertex.workspace_id === workspace_id) {
        delete vertices[vertex.id];
      }
    }
    delete workspaces[workspace_id];
    workspaceIndex = workspaceIndex.filter((entry) => entry.id !== workspace_id);
    await persistWorkspaceIndex();
  },
  async pruneMissingWorkspaces(): Promise<{ workspaces: number; vertices: number }> {
    return pruneMissingWorkspaces();
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
      workspace_id: workspaceId,
    };
    await invoke("fs_create_vertex_dir", {
      workspacePath: workspace.path,
      vertexId: vertex.id,
    });
    await ensureUrlsFile(assetDirectory);
    await persistWorkspaceData(workspaceId);
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
    const workspaceId = resolveWorkspaceId(vertices[new_vertex.id]);
    if (workspaceId) {
      await persistWorkspaceData(workspaceId);
    }
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
    await persistWorkspaceData(workspaceId);
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
