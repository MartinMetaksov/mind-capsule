import { Id } from "@/core/common/id";
import { Vertex } from "@/core/vertex";
import { Workspace } from "@/core/workspace";

export type ImageMetadata = {
  alt?: string;
  description?: string;
};

export type ImageEntry = ImageMetadata & {
  name: string;
  path: string;
};

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
  getAllVertices(): Promise<Vertex[]>;
  getWorkspaceRootVertices(workspace_id: Id): Promise<Vertex[]>;
  getVertex(vertex_id: Id): Promise<Vertex | null>;
  updateVertex(new_vertex: Vertex): Promise<void>;
  removeVertex(new_vertex: Vertex): Promise<void>;

  // images
  listImages(vertex: Vertex): Promise<ImageEntry[]>;
  getImage(vertex: Vertex, name: string): Promise<ImageEntry | null>;
  createImage(vertex: Vertex, file: File): Promise<ImageEntry>;
  deleteImage(vertex: Vertex, name: string): Promise<void>;
  updateImageMetadata(
    vertex: Vertex,
    name: string,
    metadata: ImageMetadata
  ): Promise<ImageEntry | null>;
}
