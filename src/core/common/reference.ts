import { Id } from "./id";

export type Reference =
  | { type: "vertex"; vertex_id: Id }
  | { type: "url"; url: string; title?: string }
  | { type: "image"; path: string; alt?: string }
  | { type: "comment"; text: string; created_at?: string };
