import { Workspace } from "@/core/workspace";
import { Vertex } from "@/core/vertex";
import type { FileSystem } from "../fileSystem";
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
  images: Reference[];
  notes: Reference[];
  urls: Reference[];
};

function ensureAssetStore(vertex: Vertex): AssetStore | null {
  const key = assetStorageKey(vertex.id);
  const stored = loadJson<AssetStore>(key);
  return stored ?? null;
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
    persist(assetStorageKey(vertex.id), { images: [], notes: [], urls: [] });
  });
  localStorage.setItem(SEEDED_KEY, "true");
}

seedIfRequested();

/* ---------- in-memory state ---------- */

const workspaces: Record<Id, Workspace> = loadEntries(WORKSPACE_KEY_PREFIX);
const vertices: Record<Id, Vertex> = loadEntries(VERTEX_KEY_PREFIX);

Object.values(vertices).forEach((vertex) => {
  const assetKey = assetStorageKey(vertex.id);
  const assetStore = ensureAssetStore(vertex);
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
    persist(assetKey, { images: [], notes: [], urls: [] });
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
};
