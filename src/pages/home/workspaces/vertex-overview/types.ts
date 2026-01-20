import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import type { VertexItem } from "./views/grid/VertexGrid";

export type ItemsOverviewProps = {
  variant: "items";
  label: string;
  vertex: Vertex;
  workspace: Workspace;
  onOpenVertex?: (vertexId: string) => void;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
};

export type ProjectsOverviewProps = {
  variant: "projects";
  title?: string;
  items: VertexItem[];
  workspaces: Workspace[];
  onOpenVertex: (vertexId: string) => void;
  onDeleteProject: (vertexId: string) => void;
  onChanged: () => Promise<void>;
};

export type DetachedOverviewProps = {
  variant: "detached";
  workspaces: Workspace[];
  onChanged: () => Promise<void>;
  onDetachedCountChange?: (count: number) => void;
};

export type VertexOverviewTabProps =
  | ItemsOverviewProps
  | ProjectsOverviewProps
  | DetachedOverviewProps;

export type OverviewViewMode = "grid" | "list" | "graph";
