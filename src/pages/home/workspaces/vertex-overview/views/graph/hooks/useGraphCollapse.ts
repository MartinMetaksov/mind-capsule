import * as React from "react";
import type { GraphData, GraphNode } from "../types";

type UseGraphCollapseResult = {
  collapsedIds: Set<string>;
  toggleCollapse: (vertexId: string) => void;
  visibleGraphData: GraphData | null;
};

type UseGraphCollapseOptions = {
  defaultCollapsedIds?: Set<string> | null;
};

export const useGraphCollapse = (
  graphData: GraphData | null,
  options?: UseGraphCollapseOptions
): UseGraphCollapseResult => {
  const [collapsedIds, setCollapsedIds] = React.useState<Set<string> | null>(
    null
  );

  const validIds = React.useMemo(() => {
    if (!graphData) return new Set<string>();
    return new Set(
      graphData.nodes
        .filter((node) => node.kind === "vertex" || node.kind === "workspace")
        .map((node) => node.id)
    );
  }, [graphData]);

  const normalizedDefault = React.useMemo(() => {
    if (!options?.defaultCollapsedIds || !graphData) return null;
    const next = new Set<string>();
    options.defaultCollapsedIds.forEach((id) => {
      if (validIds.has(id)) next.add(id);
    });
    return next;
  }, [graphData, options?.defaultCollapsedIds, validIds]);

  React.useEffect(() => {
    if (!graphData) return;
    setCollapsedIds((prev) => {
      if (!prev) return prev;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [graphData, validIds]);

  const toggleCollapse = React.useCallback((vertexId: string) => {
    setCollapsedIds((prev) => {
      const base = prev ?? normalizedDefault ?? new Set<string>();
      const next = new Set(base);
      if (next.has(vertexId)) {
        next.delete(vertexId);
      } else {
        next.add(vertexId);
      }
      return next;
    });
  }, [normalizedDefault]);

  const emptySet = React.useMemo(() => new Set<string>(), []);
  const effectiveCollapsedIds = React.useMemo(
    () => collapsedIds ?? normalizedDefault ?? emptySet,
    [collapsedIds, normalizedDefault, emptySet]
  );

  const visibleGraphData = React.useMemo(() => {
    if (!graphData) return null;
    if (effectiveCollapsedIds.size === 0) return graphData;
    const nodesById = new Map(graphData.nodes.map((node) => [node.id, node]));
    const childrenByParent = new Map<string, GraphNode[]>();
    const verticesByWorkspace = new Map<string, GraphNode[]>();
    graphData.nodes.forEach((node) => {
      if (node.kind !== "vertex") return;
      if (node.parentId) {
        const list = childrenByParent.get(node.parentId) ?? [];
        list.push(node);
        childrenByParent.set(node.parentId, list);
      }
      if (node.workspaceId) {
        const list = verticesByWorkspace.get(node.workspaceId) ?? [];
        list.push(node);
        verticesByWorkspace.set(node.workspaceId, list);
      }
    });
    const hidden = new Set<string>();
    const stack = Array.from(effectiveCollapsedIds);
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      const node = nodesById.get(current);
      if (!node) continue;
      if (node.kind === "workspace" && node.workspaceId) {
        const workspaceVertices = verticesByWorkspace.get(node.workspaceId) ?? [];
        workspaceVertices.forEach((child) => {
          if (hidden.has(child.id)) return;
          hidden.add(child.id);
          stack.push(child.id);
        });
        continue;
      }
      if (node.kind === "vertex") {
        const children = childrenByParent.get(current) ?? [];
        children.forEach((child) => {
          if (hidden.has(child.id)) return;
          hidden.add(child.id);
          stack.push(child.id);
        });
      }
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
  }, [effectiveCollapsedIds, graphData]);

  return { collapsedIds: effectiveCollapsedIds, toggleCollapse, visibleGraphData };
};
