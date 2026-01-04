import { Workspace } from "@/core/workspace";
import { Vertex } from "@/core/vertex";
import type { FileSystem } from "../fileSystem";
import { Id } from "@/core/common/id";
import seed from "./mock/seed-data.json";

const WORKSPACE_KEY = "mind-capsule.workspaces";
const VERTEX_KEY = "mind-capsule.vertices";
const SEEDED_KEY = "mind-capsule.seeded";

/* ---------- helpers ---------- */

function now(): string {
  return new Date().toISOString();
}

function persist(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadMap<T>(key: string): Record<Id, T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function seedIfRequested() {
  const params = new URLSearchParams(window.location.search);
  const wantsSeed = params.get("seed") === "1";
  if (!wantsSeed) return;

  const alreadySeeded = localStorage.getItem(SEEDED_KEY) === "true";
  if (alreadySeeded) return;

  const wsMap = Object.fromEntries(
    (seed.workspaces as Workspace[]).map((w) => [w.id, w]),
  );
  const vMap = Object.fromEntries(
    (seed.vertices as Vertex[]).map((v) => [v.id, v]),
  );

  persist(WORKSPACE_KEY, wsMap);
  persist(VERTEX_KEY, vMap);
  localStorage.setItem(SEEDED_KEY, "true");
}

seedIfRequested();

/* ---------- in-memory state ---------- */

const workspaces: Record<Id, Workspace> = loadMap(WORKSPACE_KEY);
const vertices: Record<Id, Vertex> = loadMap(VERTEX_KEY);

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

    persist(WORKSPACE_KEY, workspaces);
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

    persist(WORKSPACE_KEY, workspaces);
  },

  async removeWorkspace(workspace_id: Id): Promise<void> {
    delete workspaces[workspace_id];
    persist(WORKSPACE_KEY, workspaces);
  },

  /* ===== Vertices ===== */

  async createVertex(vertex: Vertex): Promise<void> {
    if (vertices[vertex.id]) {
      throw new Error(`Vertex ${vertex.id} already exists.`);
    }

    vertices[vertex.id] = {
      ...vertex,
      created_at: vertex.created_at ?? now(),
      updated_at: vertex.updated_at ?? now(),
    };

    persist(VERTEX_KEY, vertices);
  },

  async getVertices(parent_id: Id): Promise<Vertex[]> {
    return Object.values(vertices).filter((v) => v.parent_id === parent_id);
  },

  async getVertex(vertex_id: Id): Promise<Vertex | null> {
    return vertices[vertex_id] ?? null;
  },

  async updateVertex(new_vertex: Vertex): Promise<void> {
    if (!vertices[new_vertex.id]) {
      throw new Error(`Vertex ${new_vertex.id} does not exist.`);
    }

    vertices[new_vertex.id] = {
      ...new_vertex,
      updated_at: now(),
    };

    persist(VERTEX_KEY, vertices);
  },

  async removeVertex(vertex: Vertex): Promise<void> {
    delete vertices[vertex.id];

    // Also clean up children references
    for (const v of Object.values(vertices)) {
      if (v.children_ids?.includes(vertex.id)) {
        v.children_ids = v.children_ids.filter((id) => id !== vertex.id);
      }
    }

    persist(VERTEX_KEY, vertices);
  },
};
