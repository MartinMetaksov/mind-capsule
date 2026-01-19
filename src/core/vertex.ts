import { Identifiable } from "./traits/identifiable";
import { Taggable } from "./traits/taggable";
import { Timestampable } from "./traits/timestampable";
import { Thumbnailable } from "./traits/thumbnailable";
import { Id } from "./common/id";

export type ItemsDisplayHint =
  | "list"
  | "grid"
  | "canvas"
  | "graph"
  | `custom:${string}`;

export type ItemsBehavior = {
  child_kind: string;
  display: ItemsDisplayHint;
};

export type VertexLayout =
  | { mode: "linear"; order: Record<Id, number> }
  | { mode: "canvas"; positions: Record<Id, { x: number; y: number }> };

export type VertexTabId =
  | "items"
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
    items_layout?: VertexLayout;
    items_behavior?: ItemsBehavior;
    default_tab?: VertexTabId;
    is_leaf?: boolean;
    is_corrupt?: boolean;
  };
