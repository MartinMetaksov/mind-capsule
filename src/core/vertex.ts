import { Identifiable } from "./traits/identifiable";
import { Taggable } from "./traits/taggable";
import { Timestampable } from "./traits/timestampable";
import { Thumbnailable } from "./traits/thumbnailable";
import { VertexKind } from "./common/vertexKind";
import { Id } from "./common/id";
import { Reference } from "./common/reference";

export type ChildrenDisplayHint =
  | "list"
  | "grid"
  | "canvas"
  | "timeline"
  | `custom:${string}`;

export type ChildrenBehavior = {
  child_kind: VertexKind;
  display: ChildrenDisplayHint;
};

export type VertexLayout =
  | { mode: "linear"; order: Record<Id, number> }
  | { mode: "canvas"; positions: Record<Id, { x: number; y: number }> };

export type VertexTabId =
  | "children"
  | "details"
  | "tags"
  | "notes"
  | "images"
  | "urls"
  | "files"
  | "references";

export type Vertex = Identifiable &
  Thumbnailable &
  Timestampable &
  Taggable & {
    title: string;
    parent_id?: Id;
    workspace_id?: Id;
    children_layout?: VertexLayout;
    references?: Reference[];
    children_behavior?: ChildrenBehavior;
    default_tab?: VertexTabId;
    kind: VertexKind;
  };
