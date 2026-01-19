import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import type { GraphData, GraphLink, GraphNode } from "../types";
import { WORKSPACE_ANCHOR_ID } from "../constants";

export const buildGraph = (
  workspaces: Workspace[],
  vertices: Vertex[]
): GraphData => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  const anchorNode: GraphNode = {
    id: WORKSPACE_ANCHOR_ID,
    label: "anchor",
    kind: "root",
  };
  nodes.push(anchorNode);

  const workspaceNodes = workspaces.map((ws) => {
    const node: GraphNode = {
      id: `ws:${ws.id}`,
      label: ws.name,
      kind: "workspace",
      workspaceId: ws.id,
      path: ws.path,
      workspace: ws,
    };
    nodes.push(node);
    links.push({ source: anchorNode, target: node, kind: "anchor" });
    return node;
  });

  const workspaceNodeById = new Map(
    workspaceNodes.map((node) => [node.workspaceId ?? "", node])
  );

  const vertexNodes = vertices.map((vertex) => {
    const node: GraphNode = {
      id: vertex.id,
      label: vertex.title,
      kind: "vertex",
      workspaceId: vertex.workspace_id ?? null,
      parentId: vertex.parent_id ?? null,
      path: vertex.asset_directory ?? undefined,
      vertex,
    };
    nodes.push(node);
    return node;
  });

  const vertexNodeById = new Map(vertexNodes.map((node) => [node.id, node]));

  const depthCache = new Map<string, number>();
  const resolveDepth = (node: GraphNode): number => {
    if (node.kind !== "vertex") return 0;
    if (depthCache.has(node.id)) {
      return depthCache.get(node.id) as number;
    }
    if (!node.parentId) {
      depthCache.set(node.id, 1);
      return 1;
    }
    const parent = vertexNodeById.get(node.parentId);
    if (!parent) {
      depthCache.set(node.id, 1);
      return 1;
    }
    const depth = resolveDepth(parent) + 1;
    depthCache.set(node.id, depth);
    return depth;
  };

  vertexNodes.forEach((node) => {
    node.depth = resolveDepth(node);
    if (node.parentId && vertexNodeById.has(node.parentId)) {
      links.push({
        source: vertexNodeById.get(node.parentId) as GraphNode,
        target: node,
        kind: "edge",
      });
      return;
    }
    if (node.workspaceId && workspaceNodeById.has(node.workspaceId)) {
      links.push({
        source: workspaceNodeById.get(node.workspaceId) as GraphNode,
        target: node,
        kind: "edge",
      });
    }
  });

  return { nodes, links };
};
