import { Id } from "@/core/common/id";
import { Vertex } from "@/core/vertex";
import { Workspace } from "@/core/workspace";
import type { FileSystem } from "../fileSystem";
import { Store } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";

const store = await Store.load("settings.json");

const WORKSPACE_KEY = "tauri.workspaces";

type WorkspaceMap = Record<Id, Workspace>;

async function persist(key: string, value: unknown) {
  await store.set(key, value);
  await store.save();
}

async function loadMap<T>(key: string): Promise<Record<Id, T>> {
  const raw = await store.get<Record<Id, T>>(key);
  return raw ?? {};
}

const workspaces: WorkspaceMap = await loadMap<Workspace>(WORKSPACE_KEY);

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
    await invoke("fs_create_workspace", { workspace: workspaces[workspace.id] });
    await persist(WORKSPACE_KEY, workspaces);
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
    await invoke("fs_update_workspace", { workspace: workspaces[new_workspace.id] });
    await persist(WORKSPACE_KEY, workspaces);
  },
  async removeWorkspace(workspace_id: Id): Promise<void> {
    await invoke("fs_remove_workspace", { workspaceId: workspace_id });
    delete workspaces[workspace_id];
    await persist(WORKSPACE_KEY, workspaces);
  },
  async createVertex(vertex: Vertex): Promise<void> {
    await invoke("fs_create_vertex", { vertex });
  },
  async getVertices(parent_id: Id): Promise<Vertex[]> {
    return await invoke<Vertex[]>("fs_get_vertices", { parentId: parent_id });
  },
  async getWorkspaceRootVertices(workspace_id: Id): Promise<Vertex[]> {
    return await invoke<Vertex[]>("fs_get_root_vertices", { workspaceId: workspace_id });
  },
  async getVertex(vertex_id: Id): Promise<Vertex | null> {
    return await invoke<Vertex | null>("fs_get_vertex", { vertexId: vertex_id });
  },
  async updateVertex(new_vertex: Vertex): Promise<void> {
    await invoke("fs_update_vertex", { vertex: new_vertex });
  },
  async removeVertex(new_vertex: Vertex): Promise<void> {
    await invoke("fs_remove_vertex", { vertexId: new_vertex.id });
  },
};
