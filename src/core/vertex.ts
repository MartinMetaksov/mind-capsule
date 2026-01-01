import { Identifiable } from "./traits/identifiable";
import { Describeable } from "./traits/describeable";
import { Taggable } from "./traits/taggable";
import { Timestampable } from "./traits/timestampable";
import { Thumbnailable } from "./traits/thumbnailable";
import { ReferenceGroup } from "./common/referenceGroup";
import { VertexKind } from "./common/vertexKind";
import { Id } from "./common/id";

export type Vertex = Identifiable &
  Thumbnailable &
  Timestampable &
  Taggable &
  Describeable & {
    title: string;
    parent_id?: Id;
    children_ids?: Id[];
    reference_groups?: ReferenceGroup[];
    kind: VertexKind;
  };
