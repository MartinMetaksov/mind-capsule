export type VertexKind =
  | "project"
  | "chapter"
  | "section"
  | "note"
  | "generic"
  | `custom:${string}`;
