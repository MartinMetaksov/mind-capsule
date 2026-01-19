import * as d3 from "d3";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";

export type GraphNodeKind = "root" | "workspace" | "vertex";

export type GraphNode = d3.SimulationNodeDatum & {
  id: string;
  label: string;
  kind: GraphNodeKind;
  workspaceId?: string | null;
  parentId?: string | null;
  path?: string;
  depth?: number;
  targetX?: number;
  targetY?: number;
  vertex?: Vertex;
  workspace?: Workspace;
};

export type GraphLink = d3.SimulationLinkDatum<GraphNode> & {
  source: GraphNode | string;
  target: GraphNode | string;
  kind?: "anchor" | "edge";
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};
