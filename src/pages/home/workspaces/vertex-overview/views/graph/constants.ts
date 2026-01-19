import type { GraphNode } from "./types";

export const ACTION_RADIUS = 65;
export const ACTION_STAGGER_MS = 40;
export const ACTION_EXIT_MS = 200;
export const SELECTED_RING_RADIUS = 43;
export const NODE_LABEL_OFFSET = 28;
export const NODE_LABEL_SELECTED_OFFSET = 43;
export const WORKSPACE_ANCHOR_ID = "__workspace_anchor__";

export const getNodeRadius = (node: GraphNode) => {
  if (node.kind === "workspace") return 18;
  if (node.kind === "vertex") return 18;
  return 0;
};
