import { Id } from "@/core/common/id";
import { Vertex } from "@/core/vertex";
import { Workspace } from "@/core/workspace";

export interface FileSystem {
  // workspaces
  createWorkspace(workspace: Workspace): Promise<void>;
  selectWorkspaceDirectory(): Promise<string | null>;
  getWorkspaces(): Promise<Workspace[]>;
  getWorkspace(workspace_id: Id): Promise<Workspace | null>;
  updateWorkspace(new_workspace: Workspace): Promise<void>;
  removeWorkspace(workspace_id: Id): Promise<void>;

  // vertices
  createVertex(vertex: Vertex): Promise<void>;
  getVertices(parent_id: Id): Promise<Vertex[]>;
  getWorkspaceRootVertices(workspace_id: Id): Promise<Vertex[]>;
  getVertex(vertex_id: Id): Promise<Vertex | null>;
  updateVertex(new_vertex: Vertex): Promise<void>;
  removeVertex(new_vertex: Vertex): Promise<void>;

  // references
  // TODO: implement
}
