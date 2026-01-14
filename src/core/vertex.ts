import { Identifiable } from "./traits/identifiable";
import { Taggable } from "./traits/taggable";
import { Timestampable } from "./traits/timestampable";
import { Thumbnailable } from "./traits/thumbnailable";
import { Id } from "./common/id";

export type ChildrenDisplayHint =
  | "list"
  | "grid"
  | "canvas"
  | "timeline"
  | `custom:${string}`;

export type ChildrenBehavior = {
  child_kind: string;
  display: ChildrenDisplayHint;
};

export type VertexLayout =
  | { mode: "linear"; order: Record<Id, number> }
  | { mode: "canvas"; positions: Record<Id, { x: number; y: number }> };

export type VertexTabId =
  | "children"
  | "properties"
  | "tags"
  | "notes"
  | "images"
  | "urls";

export type Vertex = Identifiable &
  Thumbnailable &
  Timestampable &
  Taggable & {
    title: string;
    asset_directory: string;
    parent_id: Id | null;
    workspace_id: Id | null;
    children_layout?: VertexLayout;
    children_behavior?: ChildrenBehavior;
    default_tab?: VertexTabId;
    is_leaf?: boolean;
    is_corrupt?: boolean;
  };
