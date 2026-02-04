import * as React from "react";
import type { GraphData, GraphNode } from "../types";

type UseGraphCollapseResult = {
  collapsedIds: Set<string>;
  toggleCollapse: (vertexId: string) => void;
  visibleGraphData: GraphData | null;
};

export const useGraphCollapse = (
  graphData: GraphData | null
): UseGraphCollapseResult => {
  const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(
    () => new Set()
  );

  React.useEffect(() => {
    if (!graphData) return;
    setCollapsedIds((prev) => {
      const valid = new Set(
        graphData.nodes
          .filter((node) => node.kind === "vertex")
          .map((node) => node.id)
      );
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [graphData]);

  const toggleCollapse = React.useCallback((vertexId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(vertexId)) {
        next.delete(vertexId);
      } else {
        next.add(vertexId);
      }
      return next;
    });
  }, []);

  const visibleGraphData = React.useMemo(() => {
    if (!graphData) return null;
    if (collapsedIds.size === 0) return graphData;
    const childrenByParent = new Map<string, GraphNode[]>();
    graphData.nodes.forEach((node) => {
      if (node.kind !== "vertex" || !node.parentId) return;
      const list = childrenByParent.get(node.parentId) ?? [];
      list.push(node);
      childrenByParent.set(node.parentId, list);
    });
    const hidden = new Set<string>();
    const stack = Array.from(collapsedIds);
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      const children = childrenByParent.get(current) ?? [];
      children.forEach((child) => {
        if (hidden.has(child.id)) return;
        hidden.add(child.id);
        stack.push(child.id);
      });
    }
    const visibleNodes = graphData.nodes.filter((node) => !hidden.has(node.id));
    const visibleLinks = graphData.links.filter((link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : link.source.id;
      const targetId =
        typeof link.target === "string" ? link.target : link.target.id;
      return !hidden.has(sourceId) && !hidden.has(targetId);
    });
    return { ...graphData, nodes: visibleNodes, links: visibleLinks };
  }, [collapsedIds, graphData]);

  return { collapsedIds, toggleCollapse, visibleGraphData };
};
