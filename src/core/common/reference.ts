import { Id } from "./id";

export type Reference =
  | { type: "vertex"; vertex_id: Id; reference_description?: string }
  | { type: "url"; url: string; title?: string }
  | { type: "image"; path: string; alt?: string; description?: string }
  | {
      type: "file";
      path: string;
      alt?: string;
      extension?: string;
      iconPath?: string;
    }
  | { type: "note"; text: string; created_at?: string };
