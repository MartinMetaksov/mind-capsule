import { Id } from "@/core/common/id";
import { Vertex } from "@/core/vertex";
import { Workspace } from "@/core/workspace";
import type { FileSystem } from "../fileSystem";
import { Store } from "@tauri-apps/plugin-store";

const store = await Store.load("settings.json");

export const fileSystem: FileSystem = {
  createWorkspace: function (workspace: Workspace): Promise<void> {
    throw new Error("Function not implemented.");
  },
  selectWorkspaceDirectory: function (): Promise<string | null> {
    throw new Error("Function not implemented.");
  },
  getWorkspaces: function (): Promise<Workspace[]> {
    throw new Error("Function not implemented.");
  },
  getWorkspace: function (workspace_id: Id): Promise<Workspace | null> {
    throw new Error("Function not implemented.");
  },
  updateWorkspace: function (new_workspace: Workspace): Promise<void> {
    throw new Error("Function not implemented.");
  },
  removeWorkspace: function (workspace_id: Id): Promise<void> {
    throw new Error("Function not implemented.");
  },
  createVertex: function (vertex: Vertex): Promise<void> {
    throw new Error("Function not implemented.");
  },
  getVertices: function (parent_id: Id): Promise<Vertex[]> {
    throw new Error("Function not implemented.");
  },
  getWorkspaceRootVertices: function (workspace_id: Id): Promise<Vertex[]> {
    throw new Error("Function not implemented.");
  },
  getVertex: function (vertex_id: Id): Promise<Vertex | null> {
    throw new Error("Function not implemented.");
  },
  updateVertex: function (new_vertex: Vertex): Promise<void> {
    throw new Error("Function not implemented.");
  },
  removeVertex: function (new_vertex: Vertex): Promise<void> {
    throw new Error("Function not implemented.");
  },
};
