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

export type NoteEntry = {
  name: string;
  text: string;
};

export type UrlEntry = {
  id: string;
  url: string;
  title?: string;
};

export interface FileSystem {
  // workspaces
  createWorkspace(workspace: Workspace): Promise<void>;
  selectWorkspaceDirectory(): Promise<string | null>;
  getWorkspaces(): Promise<Workspace[]>;
  getWorkspace(workspace_id: Id): Promise<Workspace | null>;
  updateWorkspace(new_workspace: Workspace): Promise<void>;
  removeWorkspace(workspace_id: Id): Promise<void>;
  pruneMissingWorkspaces(): Promise<{ workspaces: number; vertices: number }>;

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

  // notes
  listNotes(vertex: Vertex): Promise<NoteEntry[]>;
  getNote(vertex: Vertex, name: string): Promise<NoteEntry | null>;
  createNote(vertex: Vertex, text: string): Promise<NoteEntry>;
  deleteNote(vertex: Vertex, name: string): Promise<void>;
  updateNote(vertex: Vertex, name: string, text: string): Promise<NoteEntry | null>;

  // links
  listLinks(vertex: Vertex): Promise<UrlEntry[]>;
  getLink(vertex: Vertex, id: string): Promise<UrlEntry | null>;
  createLink(vertex: Vertex, link: Omit<UrlEntry, "id">): Promise<UrlEntry>;
  deleteLink(vertex: Vertex, id: string): Promise<void>;
  updateLink(
    vertex: Vertex,
    id: string,
    link: Omit<UrlEntry, "id">
  ): Promise<UrlEntry | null>;
}
