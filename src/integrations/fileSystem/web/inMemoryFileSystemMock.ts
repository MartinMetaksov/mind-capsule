import { Workspace } from "@/core/workspace";
import { Vertex } from "@/core/vertex";
import type {
  FileSystem,
  ImageEntry,
  ImageMetadata,
  NoteEntry,
  UrlEntry,
} from "../fileSystem";
import { Id } from "@/core/common/id";
import type { Reference } from "@/core/common/reference";
import seed from "./mock/seed-data.json";
import {
  SEEDED_KEY,
  VERTEX_KEY_PREFIX,
  WORKSPACE_KEY_PREFIX,
  assetStorageKey,
  vertexStorageKey,
  workspaceStorageKey,
} from "./storageKeys";

/* ---------- helpers ---------- */

function now(): string {
  return new Date().toISOString();
}

function persist(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadEntries<T>(prefix: string): Record<Id, T> {
  const map: Record<Id, T> = {};
  Object.keys(localStorage).forEach((key) => {
    if (!key.startsWith(prefix) || !key.endsWith(".json")) return;
    const id = key.slice(prefix.length, -".json".length);
    if (!id) return;
    const value = loadJson<T>(key);
    if (value) {
      map[id] = value;
    }
  });
  return map;
}

type AssetStore = {
  images: Record<string, string>;
  image_meta: Record<string, ImageMetadata>;
  notes: Record<string, string>;
  urls: UrlEntry[];
};

function guessExtensionFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);/);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  if (ext === "jpeg") return "jpg";
  return ext;
}

function normalizeAssetStore(stored: unknown): AssetStore | null {
  if (!stored || typeof stored !== "object") return null;
  const raw = stored as Partial<AssetStore> & { images?: unknown; notes?: unknown; urls?: unknown };
  let notes: Record<string, string> =
    raw.notes && typeof raw.notes === "object" && !Array.isArray(raw.notes)
      ? (raw.notes as Record<string, string>)
      : {};
  let urls = Array.isArray(raw.urls) ? raw.urls : [];

  if (Array.isArray(raw.notes)) {
    const converted: Record<string, string> = {};
    raw.notes.forEach((entry, idx) => {
      const ref = entry as Reference | undefined;
      if (!ref || ref.type !== "note") return;
      const stamp = ref.created_at ?? `rev-${idx + 1}`;
      const name = sanitizeNoteName(`note-${stamp}.md`);
      converted[name] = ref.text ?? "";
    });
    notes = converted;
  }

  if (Array.isArray(raw.urls)) {
    const converted: UrlEntry[] = [];
    raw.urls.forEach((entry) => {
      const candidate = entry as Partial<UrlEntry> & Reference;
      if (candidate && typeof candidate.id === "string" && candidate.url) {
        converted.push({
          id: candidate.id,
          url: candidate.url,
          title: candidate.title,
        });
        return;
      }
      if (candidate?.type === "url" && typeof candidate.url === "string") {
        converted.push({
          id: crypto.randomUUID(),
          url: candidate.url,
          title: candidate.title,
        });
      }
    });
    urls = converted;
  }

  if (raw.images && typeof raw.images === "object" && !Array.isArray(raw.images)) {
    const images = raw.images as Record<string, string>;
    const image_meta =
      raw.image_meta && typeof raw.image_meta === "object"
        ? (raw.image_meta as Record<string, ImageMetadata>)
        : {};
    return { images, image_meta, notes, urls };
  }

  if (Array.isArray(raw.images)) {
    const images: Record<string, string> = {};
    const image_meta: Record<string, ImageMetadata> = {};
    raw.images.forEach((entry, idx) => {
      const ref = entry as Reference | undefined;
      if (!ref || ref.type !== "image" || typeof ref.path !== "string") return;
      const ext = guessExtensionFromDataUrl(ref.path) ?? "png";
      const name = `image-${idx + 1}.${ext}`;
      images[name] = ref.path;
      if (ref.alt || ref.description) {
        image_meta[name] = { alt: ref.alt, description: ref.description };
      }
    });
    return { images, image_meta, notes, urls };
  }

  return null;
}

function needsAssetStoreUpgrade(stored: unknown): boolean {
  if (!stored || typeof stored !== "object") return false;
  const raw = stored as {
    images?: unknown;
    image_meta?: unknown;
    notes?: unknown;
    urls?: unknown;
  };
  if (Array.isArray(raw.images)) return true;
  if (!raw.images || typeof raw.images !== "object") return true;
  if (!raw.image_meta || typeof raw.image_meta !== "object") return true;
  if (Array.isArray(raw.notes)) return true;
  if (!raw.notes || typeof raw.notes !== "object") return true;
  if (Array.isArray(raw.urls)) return true;
  return false;
}

function sanitizeNoteName(name: string): string {
  return name.replace(/[^\w.-]+/g, "-");
}

function createNoteName(prefix = "note"): string {
  const stamp = new Date().toISOString().replace(/[:]/g, "-");
  return sanitizeNoteName(`${prefix}-${stamp}.md`);
}

function loadAssetStore(vertex: Vertex): AssetStore | null {
  const key = assetStorageKey(vertex.id);
  const stored = loadJson<unknown>(key);
  const normalized = normalizeAssetStore(stored);
  if (normalized && needsAssetStoreUpgrade(stored)) {
    persist(key, normalized);
  }
  return normalized;
}

function saveAssetStore(vertex: Vertex, store: AssetStore) {
  persist(assetStorageKey(vertex.id), store);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Invalid file"));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function pickImageExtension(file: File): string {
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;
  const type = file.type?.toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "png";
}

function createImageName(file: File, store: AssetStore): string {
  const ext = pickImageExtension(file);
  let name = `${crypto.randomUUID()}.${ext}`;
  while (store.images[name]) {
    name = `${crypto.randomUUID()}.${ext}`;
  }
  return name;
}

function seedIfRequested() {
  const params = new URLSearchParams(window.location.search);
  const wantsSeed = params.get("seed") === "1";
  if (!wantsSeed) return;

  const alreadySeeded = localStorage.getItem(SEEDED_KEY) === "true";
  if (alreadySeeded) return;

  (seed.workspaces as Workspace[]).forEach((workspace) => {
    persist(workspaceStorageKey(workspace.id), workspace);
  });
  (seed.vertices as Vertex[]).forEach((vertex) => {
    persist(vertexStorageKey(vertex.id), vertex);
    persist(assetStorageKey(vertex.id), {
      images: {},
      image_meta: {},
      notes: {},
      urls: [],
    });
  });
  localStorage.setItem(SEEDED_KEY, "true");
}

seedIfRequested();

/* ---------- in-memory state ---------- */

const workspaces: Record<Id, Workspace> = loadEntries(WORKSPACE_KEY_PREFIX);
const vertices: Record<Id, Vertex> = loadEntries(VERTEX_KEY_PREFIX);

Object.values(vertices).forEach((vertex) => {
  const assetKey = assetStorageKey(vertex.id);
  const assetStore = loadAssetStore(vertex);
  if (!vertex.asset_directory) {
    vertex.asset_directory = assetKey;
    vertex.is_corrupt = true;
  }
  if (!assetStore) {
    vertex.is_corrupt = true;
  }
});

/* ---------- mock filesystem ---------- */

export const inMemoryFileSystemMock: FileSystem = {
  /* ===== Workspaces ===== */

  async createWorkspace(workspace: Workspace): Promise<void> {
    if (workspaces[workspace.id]) {
      throw new Error(`Workspace ${workspace.id} already exists.`);
    }

    workspaces[workspace.id] = {
      ...workspace,
      created_at: workspace.created_at ?? now(),
      updated_at: workspace.updated_at ?? now(),
    };

    persist(workspaceStorageKey(workspace.id), workspaces[workspace.id]);
  },

  async selectWorkspaceDirectory(): Promise<string | null> {
    return "memory://workspace";
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
      updated_at: now(),
    };

    persist(workspaceStorageKey(new_workspace.id), workspaces[new_workspace.id]);
  },

  async removeWorkspace(workspace_id: Id): Promise<void> {
    Object.values(vertices).forEach((vertex) => {
      if (vertex.workspace_id === workspace_id) {
        delete vertices[vertex.id];
        localStorage.removeItem(vertexStorageKey(vertex.id));
        localStorage.removeItem(assetStorageKey(vertex.id));
      }
    });
    delete workspaces[workspace_id];
    localStorage.removeItem(workspaceStorageKey(workspace_id));
  },
  async pruneMissingWorkspaces(): Promise<{ workspaces: number; vertices: number }> {
    return { workspaces: 0, vertices: 0 };
  },

  /* ===== Vertices ===== */

  async createVertex(vertex: Vertex): Promise<void> {
    if (vertices[vertex.id]) {
      throw new Error(`Vertex ${vertex.id} already exists.`);
    }

    const assetKey = assetStorageKey(vertex.id);
    vertices[vertex.id] = {
      ...vertex,
      asset_directory: assetKey,
      created_at: vertex.created_at ?? now(),
      updated_at: vertex.updated_at ?? now(),
    };

    persist(vertexStorageKey(vertex.id), vertices[vertex.id]);
    saveAssetStore(vertex, { images: {}, image_meta: {}, notes: {}, urls: [] });
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

    const assetKey = new_vertex.asset_directory || assetStorageKey(new_vertex.id);
    vertices[new_vertex.id] = {
      ...new_vertex,
      asset_directory: assetKey,
      updated_at: now(),
    };

    persist(vertexStorageKey(new_vertex.id), vertices[new_vertex.id]);
  },

  async removeVertex(vertex: Vertex): Promise<void> {
    delete vertices[vertex.id];
    localStorage.removeItem(vertexStorageKey(vertex.id));
    localStorage.removeItem(assetStorageKey(vertex.id));
  },

  /* ===== Images ===== */

  async listImages(vertex: Vertex): Promise<ImageEntry[]> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    return Object.entries(store.images).map(([name, path]) => ({
      name,
      path,
      ...(store.image_meta[name] ?? {}),
    }));
  },

  async getImage(vertex: Vertex, name: string): Promise<ImageEntry | null> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    const path = store.images[name];
    if (!path) return null;
    return { name, path, ...(store.image_meta[name] ?? {}) };
  },

  async createImage(vertex: Vertex, file: File): Promise<ImageEntry> {
    const path = await fileToDataUrl(file);
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    let name = createImageName(file, store);
    while (store.images[name]) {
      name = createImageName(file, store);
    }
    store.images[name] = path;
    saveAssetStore(vertex, store);
    return { name, path };
  },

  async deleteImage(vertex: Vertex, name: string): Promise<void> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    delete store.images[name];
    delete store.image_meta[name];
    saveAssetStore(vertex, store);
  },

  async updateImageMetadata(
    vertex: Vertex,
    name: string,
    metadata: ImageMetadata
  ): Promise<ImageEntry | null> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    const path = store.images[name];
    if (!path) return null;
    const nextMeta = {
      alt: metadata.alt?.trim() || undefined,
      description: metadata.description?.trim() || undefined,
    };
    if (!nextMeta.alt && !nextMeta.description) {
      delete store.image_meta[name];
    } else {
      store.image_meta[name] = nextMeta;
    }
    saveAssetStore(vertex, store);
    return { name, path, ...(store.image_meta[name] ?? {}) };
  },

  /* ===== Notes ===== */

  async listNotes(vertex: Vertex): Promise<NoteEntry[]> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    return Object.entries(store.notes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, text]) => ({ name, text }));
  },

  async getNote(vertex: Vertex, name: string): Promise<NoteEntry | null> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    const text = store.notes[name];
    if (text === undefined) return null;
    return { name, text };
  },

  async createNote(vertex: Vertex, text: string): Promise<NoteEntry> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    let name = createNoteName();
    while (store.notes[name]) {
      name = createNoteName();
    }
    store.notes[name] = text;
    saveAssetStore(vertex, store);
    return { name, text };
  },

  async deleteNote(vertex: Vertex, name: string): Promise<void> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    delete store.notes[name];
    saveAssetStore(vertex, store);
  },

  async updateNote(vertex: Vertex, name: string, text: string): Promise<NoteEntry | null> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    if (!(name in store.notes)) return null;
    store.notes[name] = text;
    saveAssetStore(vertex, store);
    return { name, text };
  },

  /* ===== Links ===== */

  async listLinks(vertex: Vertex): Promise<UrlEntry[]> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    return [...store.urls];
  },

  async getLink(vertex: Vertex, id: string): Promise<UrlEntry | null> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    const entry = store.urls.find((link) => link.id === id);
    return entry ? { ...entry } : null;
  },

  async createLink(
    vertex: Vertex,
    link: Omit<UrlEntry, "id">
  ): Promise<UrlEntry> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    const entry: UrlEntry = {
      id: crypto.randomUUID(),
      url: link.url,
      title: link.title,
    };
    store.urls = [...store.urls, entry];
    saveAssetStore(vertex, store);
    return entry;
  },

  async deleteLink(vertex: Vertex, id: string): Promise<void> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    store.urls = store.urls.filter((link) => link.id !== id);
    saveAssetStore(vertex, store);
  },

  async updateLink(
    vertex: Vertex,
    id: string,
    link: Omit<UrlEntry, "id">
  ): Promise<UrlEntry | null> {
    const store = loadAssetStore(vertex);
    if (!store) {
      throw new Error(`Assets for vertex ${vertex.id} are missing.`);
    }
    const idx = store.urls.findIndex((entry) => entry.id === id);
    if (idx === -1) return null;
    const updated: UrlEntry = { id, url: link.url, title: link.title };
    store.urls = store.urls.map((entry, i) => (i === idx ? updated : entry));
    saveAssetStore(vertex, store);
    return updated;
  },
};
