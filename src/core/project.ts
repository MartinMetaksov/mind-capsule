import { Identifiable } from "./traits/identifiable";
import { Describeable } from "./traits/describeable";
import { Taggable } from "./traits/taggable";
import { Timestampable } from "./traits/timestampable";
import { Thumbnailable } from "./traits/thumbnailable";

export type Project = Identifiable &
  Thumbnailable &
  Timestampable &
  Taggable &
  Describeable & {
    title: string;
    related_project_ids?: string[];
  };
