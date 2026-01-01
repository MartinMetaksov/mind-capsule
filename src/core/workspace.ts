import { Id } from "./common/id";
import { Identifiable } from "./traits/identifiable";
import { Taggable } from "./traits/taggable";
import { Timestampable } from "./traits/timestampable";

export type Workspace = Identifiable &
  Timestampable &
  Taggable & {
    name: string;
    path: string;
    purpose?: string;
    root_vertex_ids?: Id[];
  };
