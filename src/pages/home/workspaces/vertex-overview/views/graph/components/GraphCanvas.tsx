import * as React from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material";
import type { GraphData, GraphLink, GraphNode } from "../types";
import type { VertexItemCounts } from "../../grid/VertexGrid";
import {
  NODE_LABEL_OFFSET,
  NODE_LABEL_SELECTED_OFFSET,
  SELECTED_RING_RADIUS,
  WORKSPACE_ANCHOR_ID,
  getNodeRadius,
} from "../constants";

type GraphCanvasProps = {
  graphData: GraphData | null;
  currentVertexId: string | null;
  selectedId: string | null;
  hoveredId: string | null;
  countsByVertexId: Record<string, VertexItemCounts>;
  collapsedIds: Set<string>;
  onToggleCollapse?: (vertexId: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<SVGSVGElement>;
  actionRef: React.RefObject<HTMLDivElement>;
  nodesByIdRef: React.MutableRefObject<Map<string, GraphNode>>;
  zoomTransformRef: React.MutableRefObject<d3.ZoomTransform>;
  zoomBehaviorRef: React.MutableRefObject<
    d3.ZoomBehavior<SVGSVGElement, unknown> | null
  >;
  persistTransformKey: string;
  onSelectId: (id: string | null) => void;
  onHoverId: (id: string | null) => void;
  onPannedStateChange: (transform: d3.ZoomTransform) => void;
};

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  graphData,
  currentVertexId,
  selectedId,
  hoveredId,
  countsByVertexId,
  collapsedIds,
  onToggleCollapse,
  containerRef,
  svgRef,
  actionRef,
  nodesByIdRef,
  zoomTransformRef,
  zoomBehaviorRef,
  persistTransformKey,
  onSelectId,
  onHoverId,
  onPannedStateChange,
}) => {
  const theme = useTheme();
  const nodeSelectionRef = React.useRef<
    d3.Selection<SVGCircleElement, GraphNode, SVGGElement, unknown> | null
  >(null);
  const nodeBackgroundRef = React.useRef<
    d3.Selection<SVGCircleElement, GraphNode, SVGGElement, unknown> | null
  >(null);
  const labelSelectionRef = React.useRef<
    d3.Selection<SVGTextElement, GraphNode, SVGGElement, unknown> | null
  >(null);
  const selectionRingRef = React.useRef<
    d3.Selection<SVGCircleElement, GraphNode, SVGGElement, unknown> | null
  >(null);
  const countGroupRef = React.useRef<
    d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown> | null
  >(null);
  const selectedIdRef = React.useRef<string | null>(null);
  const countsByIdRef = React.useRef<Record<string, VertexItemCounts>>({});
  const hoveredIdRef = React.useRef<string | null>(null);
  const collapsedIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  React.useEffect(() => {
    hoveredIdRef.current = hoveredId;
  }, [hoveredId]);

  React.useEffect(() => {
    countsByIdRef.current = countsByVertexId;
  }, [countsByVertexId]);

  React.useEffect(() => {
    collapsedIdsRef.current = collapsedIds;
  }, [collapsedIds]);

  React.useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;

    const { clientWidth, clientHeight } = containerRef.current;
    const width = Math.max(clientWidth, 300);
    const height = Math.max(clientHeight, 300);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .style("user-select", "none")
      .style("-webkit-user-select", "none")
      .style("-ms-user-select", "none")
      .style("-moz-user-select", "none");

    const root = svg.append("g");

    const renderNodes = graphData.nodes.filter(
      (node) => node.id !== WORKSPACE_ANCHOR_ID
    );

    const workspaceNodes = renderNodes.filter(
      (node) => node.kind === "workspace"
    );
    const workspaceAnchors = new Map<string, { x: number; y: number }>();
    const anchorRadius = Math.min(width, height) * 0.22;
    workspaceNodes.forEach((node, index) => {
      const angle = (index / Math.max(1, workspaceNodes.length)) * Math.PI * 2;
      const anchor = {
        x: width / 2 + Math.cos(angle) * anchorRadius,
        y: height / 2 + Math.sin(angle) * anchorRadius,
      };
      if (node.workspaceId) {
        workspaceAnchors.set(node.workspaceId, anchor);
      }
    });

    const vertexNodes = renderNodes.filter((node) => node.kind === "vertex");
    const childrenByParentId = new Map<string, GraphNode[]>();
    const rootsByWorkspaceId = new Map<string, GraphNode[]>();

    vertexNodes.forEach((node) => {
      if (node.parentId) {
        const list = childrenByParentId.get(node.parentId) ?? [];
        list.push(node);
        childrenByParentId.set(node.parentId, list);
        return;
      }
      if (node.workspaceId) {
        const list = rootsByWorkspaceId.get(node.workspaceId) ?? [];
        list.push(node);
        rootsByWorkspaceId.set(node.workspaceId, list);
      }
    });

    type LayoutNode = { graph: GraphNode; children?: LayoutNode[] };
    const buildLayoutTree = (node: GraphNode): LayoutNode => {
      const children = childrenByParentId.get(node.id) ?? [];
      return {
        graph: node,
        children: children.length ? children.map(buildLayoutTree) : undefined,
      };
    };

    const treeLayout = d3
      .tree<LayoutNode>()
      .nodeSize([120, 120])
      .separation((a, b) => (a.parent === b.parent ? 1.1 : 1.6));

    workspaceNodes.forEach((workspaceNode) => {
      const anchor = workspaceNode.workspaceId
        ? workspaceAnchors.get(workspaceNode.workspaceId)
        : null;
      if (!anchor) return;
      const roots = rootsByWorkspaceId.get(workspaceNode.workspaceId ?? "") ?? [];
      const rootData: LayoutNode = {
        graph: workspaceNode,
        children: roots.length ? roots.map(buildLayoutTree) : undefined,
      };
      const hierarchy = d3.hierarchy(rootData, (d) => d.children);
      treeLayout(hierarchy);
      hierarchy.each((entry) => {
        entry.data.graph.targetX = anchor.x + (entry.x ?? 0);
        entry.data.graph.targetY = anchor.y + (entry.y ?? 0);
      });
    });

    renderNodes.forEach((node) => {
      if (node.targetX === undefined) node.targetX = width / 2;
      if (node.targetY === undefined) node.targetY = height / 2;
    });

    const visibleLinks = graphData.links.filter(
      (link) => link.kind !== "anchor"
    );
    const link = root
      .append("g")
      .attr(
        "stroke",
        theme.palette.mode === "dark"
          ? "rgba(255, 255, 255, 0.28)"
          : "rgba(0, 0, 0, 0.35)"
      )
      .attr("stroke-opacity", theme.palette.mode === "dark" ? 0.9 : 0.7)
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(visibleLinks)
      .join("line")
      .attr("stroke-width", theme.palette.mode === "dark" ? 1.8 : 1.2);

    const selectionRing = root
      .append("g")
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data([] as GraphNode[])
      .join("circle")
      .attr("class", "graph-selection-ring")
      .attr("fill", "none")
      .attr("stroke", theme.palette.warning.main)
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.6);
    selectionRingRef.current = selectionRing;

    const defs = root.append("defs");
    const thumbNodes = vertexNodes.filter(
      (node) => node.vertex?.thumbnail_path
    );
    const sanitizeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_");
    const patterns = defs
      .selectAll("pattern")
      .data(thumbNodes)
      .join("pattern")
      .attr("id", (d) => `thumb-${sanitizeId(d.id)}`)
      .attr("patternUnits", "objectBoundingBox")
      .attr("patternContentUnits", "objectBoundingBox")
      .attr("width", 1)
      .attr("height", 1);

    patterns
      .append("image")
      .attr("href", (d) => d.vertex?.thumbnail_path ?? "")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 1)
      .attr("height", 1)
      .attr("preserveAspectRatio", "xMidYMid slice");

    const countRingItems = [
      { key: "items", label: "It", angle: -160 },
      { key: "notes", label: "No", angle: -120 },
      { key: "images", label: "Im", angle: -80 },
      { key: "urls", label: "Li", angle: -40 },
      { key: "files", label: "Fi", angle: 0 },
    ] as const;

    const countGroup = root
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(vertexNodes)
      .join("g")
      .attr("class", "graph-count-ring")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("transition", "opacity 160ms ease");

    countGroup.each(function (node) {
      const group = d3.select(this);
      const items = group
        .selectAll<SVGGElement, (typeof countRingItems)[number]>("g")
        .data(countRingItems)
        .join("g")
        .attr("class", "graph-count-item");

      items
        .append("circle")
        .attr("r", 10)
        .attr("fill", theme.palette.background.paper)
        .attr("stroke", theme.palette.divider)
        .attr("stroke-width", 0.8)
        .attr("opacity", 0.85);

      items
        .append("text")
        .attr("class", "graph-count-label")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", theme.palette.text.secondary)
        .attr("font-size", 7)
        .attr("font-weight", 600)
        .attr("transform", "translate(0, -3)")
        .text((entry) => entry.label);

      items
        .append("text")
        .attr("class", "graph-count-value")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", theme.palette.text.primary)
        .attr("font-size", 9)
        .attr("font-weight", 700)
        .attr("transform", "translate(0, 5)")
        .text((entry) => {
          const counts = countsByIdRef.current[node.id];
          const value = counts ? counts[entry.key] : 0;
          return `${value}`;
        });
    });

    countGroupRef.current = countGroup;

    const nodeBackground = root
      .append("g")
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(renderNodes)
      .join("circle")
      .attr("class", "graph-node-bg")
      .attr("data-node-id", (d: GraphNode) => d.id)
      .attr("fill", theme.palette.background.paper)
      .attr("r", (d: GraphNode) => getNodeRadius(d));

    nodeBackgroundRef.current = nodeBackground;

    const node = root
      .append("g")
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(renderNodes)
      .join("circle")
      .attr("class", "graph-node")
      .attr("data-node-id", (d: GraphNode) => d.id)
      .classed("graph-node-selected", (d: GraphNode) => d.id === currentVertexId)
      .style("--node-fill", (d: GraphNode) =>
        d.kind === "workspace"
          ? theme.palette.primary.main
          : theme.palette.mode === "dark"
            ? "#8fa3ff"
            : "#4b5cff"
      )
      .style("--node-fill-alt", (d: GraphNode) =>
        d.kind === "workspace"
          ? theme.palette.primary.light
          : theme.palette.mode === "dark"
            ? "#c2cbff"
            : "#6f7dff"
      )
      .style("fill", (d: GraphNode) => {
        if (d.kind === "vertex" && d.vertex?.thumbnail_path) {
          return `url(#thumb-${sanitizeId(d.id)})`;
        }
        return "var(--node-fill)";
      })
      .attr("stroke", (d: GraphNode) =>
        d.id === currentVertexId
          ? theme.palette.warning.main
          : theme.palette.background.paper
      )
      .attr("stroke-width", (d: GraphNode) =>
        d.id === currentVertexId ? 3 : 1.5
      )
      .attr("r", (d: GraphNode) => getNodeRadius(d))
      .style("cursor", "pointer")
      .style("user-select", "none")
      .style("-webkit-user-select", "none")
      .on("mouseenter", (_event: MouseEvent, d: GraphNode) => {
        onHoverId(d.id);
      })
      .on("mouseleave", () => onHoverId(null))
      .on("dblclick", (event: MouseEvent, d: GraphNode) => {
        if (d.kind !== "vertex") return;
        event.stopPropagation();
        onToggleCollapse?.(d.id);
      })
      .on("click", (event: MouseEvent, d: GraphNode) => {
        event.stopPropagation();
        onSelectId(selectedIdRef.current === d.id ? null : d.id);
      });

    nodeSelectionRef.current = node;

    const label = root
      .append("g")
      .selectAll<SVGTextElement, GraphNode>("text")
      .data(renderNodes)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.text.primary)
      .attr("font-size", 11)
      .style("pointer-events", "none")
      .style("user-select", "none")
      .style("-webkit-user-select", "none")
      .on("mousedown", (event: MouseEvent) => {
        event.preventDefault();
      })
      .text((d: GraphNode) => d.label);
    labelSelectionRef.current = label;

    let collapsedMarker = root
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(vertexNodes.filter((node) => collapsedIdsRef.current.has(node.id)))
      .join("g")
      .attr("class", "graph-collapsed-marker")
      .style("pointer-events", "none");

    collapsedMarker
      .append("circle")
      .attr("r", 12)
      .attr("fill", theme.palette.primary.main)
      .attr("stroke", theme.palette.background.paper)
      .attr("stroke-width", 1.4)
      .attr("opacity", 0.95);

    collapsedMarker
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", theme.palette.common.white)
      .attr("font-size", 14)
      .attr("font-weight", 800)
      .text("+");
    countGroup.raise();

    svg.on("click", () => onSelectId(null));

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .filter((event) => {
        if (selectedIdRef.current) return false;
        if (event.type !== "mousedown") return false;
        const target = event.target as Element | null;
        return target?.tagName !== "circle";
      })
      .on("zoom", (event) => {
        root.attr("transform", event.transform.toString());
        zoomTransformRef.current = event.transform;
        onPannedStateChange(event.transform);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            persistTransformKey,
            JSON.stringify({
              k: event.transform.k,
              x: event.transform.x,
              y: event.transform.y,
            })
          );
        }
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom as d3.ZoomBehavior<SVGSVGElement, unknown>);
    svg.call(zoom.transform, zoomTransformRef.current);

    const simulation = d3
      .forceSimulation(graphData.nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(graphData.links)
          .id((d) => d.id)
          .distance((link) =>
            (link.source as GraphNode).id === WORKSPACE_ANCHOR_ID ? 120 : 100
          )
          .strength((link) =>
            (link.source as GraphNode).id === WORKSPACE_ANCHOR_ID ? 0.08 : 0.45
          )
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(48))
      .force(
        "x",
        d3
          .forceX((d: GraphNode) => d.targetX ?? width / 2)
          .strength(0.25)
      )
      .force(
        "y",
        d3
          .forceY((d: GraphNode) => d.targetY ?? height / 2)
          .strength(0.25)
      );

    simulation.on("tick", () => {
      link
        .attr("x1", (d: GraphLink) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d: GraphLink) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d: GraphLink) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d: GraphLink) => (d.target as GraphNode).y ?? 0);

      node.attr("cx", (d: GraphNode) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      nodeBackground
        .attr("cx", (d: GraphNode) => d.x ?? 0)
        .attr("cy", (d) => d.y ?? 0);
      collapsedMarker = collapsedMarker
        .data(
          vertexNodes.filter((node) => collapsedIdsRef.current.has(node.id))
        )
        .join((enter) => {
          const group = enter
            .append("g")
            .attr("class", "graph-collapsed-marker")
            .style("pointer-events", "none");
          group
            .append("circle")
            .attr("r", 12)
            .attr("fill", theme.palette.primary.main)
            .attr("stroke", theme.palette.background.paper)
            .attr("stroke-width", 1.4)
            .attr("opacity", 0.95);
          group
            .append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", theme.palette.common.white)
            .attr("font-size", 14)
            .attr("font-weight", 800)
            .text("+");
          return group;
        })
        .attr("transform", (d: GraphNode) => {
          const x = d.x ?? 0;
          const y = d.y ?? 0;
          return `translate(${x}, ${y})`;
        });
      collapsedMarker
        .attr("opacity", 1)
        .raise();

      label
        .attr("x", (d: GraphNode) => d.x ?? 0)
        .attr(
          "y",
          (d: GraphNode) =>
            (d.y ?? 0) +
            getNodeRadius(d) +
            (d.id === selectedIdRef.current
              ? NODE_LABEL_SELECTED_OFFSET
              : NODE_LABEL_OFFSET)
          );

      const countGroupSelection = countGroupRef.current;
      if (countGroupSelection) {
        countGroupSelection.each(function (node) {
          const group = d3.select(this);
          const radius = getNodeRadius(node) + 18;
          group.attr("transform", `translate(${node.x ?? 0}, ${node.y ?? 0})`);
          group.style(
            "opacity",
            node.id === hoveredIdRef.current ? "1" : "0"
          );
          group
            .selectAll<SVGGElement, (typeof countRingItems)[number]>("g")
            .attr("transform", (entry) => {
              const radians = (entry.angle * Math.PI) / 180;
              const x = Math.cos(radians) * radius;
              const y = Math.sin(radians) * radius;
              return `translate(${x}, ${y})`;
            });
        });
      }

      nodesByIdRef.current = new Map(
        graphData.nodes.map((n) => [n.id, n])
      );

      if (actionRef.current && selectedIdRef.current) {
        const selectedNode = nodesByIdRef.current.get(
          selectedIdRef.current
        );
        if (selectedNode && selectedNode.x && selectedNode.y) {
          const transformed = zoomTransformRef.current.apply([
            selectedNode.x,
            selectedNode.y,
          ]);
          actionRef.current.style.transform = `translate(${transformed[0]}px, ${transformed[1]}px)`;
        }
      }

      if (selectedIdRef.current) {
        const selectedNode = nodesByIdRef.current.get(selectedIdRef.current);
        if (selectedNode) {
          selectionRing
            .data([selectedNode])
            .attr("cx", selectedNode.x ?? 0)
            .attr("cy", selectedNode.y ?? 0)
            .attr("r", SELECTED_RING_RADIUS);
        }
      } else {
        selectionRing.data([]).attr("r", 0);
      }
    });

    return () => {
      simulation.stop();
    };
  }, [
    actionRef,
    containerRef,
    currentVertexId,
    graphData,
    nodesByIdRef,
    onHoverId,
    onPannedStateChange,
    onSelectId,
    onToggleCollapse,
    persistTransformKey,
    svgRef,
    theme,
    zoomBehaviorRef,
    zoomTransformRef,
  ]);

  React.useEffect(() => {
    const labels = labelSelectionRef.current;
    if (labels) {
      labels.attr(
        "y",
        (d: GraphNode) =>
          (d.y ?? 0) +
          getNodeRadius(d) +
          (d.id === selectedId ? NODE_LABEL_SELECTED_OFFSET : NODE_LABEL_OFFSET)
      );
    }

    const selectionRing = selectionRingRef.current;
    if (selectionRing) {
      if (selectedId) {
        const selectedNode = nodesByIdRef.current.get(selectedId);
        if (selectedNode) {
          selectionRing
            .data([selectedNode])
            .attr("cx", selectedNode.x ?? 0)
            .attr("cy", selectedNode.y ?? 0)
            .attr("r", SELECTED_RING_RADIUS);
        }
      } else {
        selectionRing.data([]).attr("r", 0);
      }
    }

    if (actionRef.current) {
      if (selectedId) {
        const selectedNode = nodesByIdRef.current.get(selectedId);
        if (selectedNode && selectedNode.x && selectedNode.y) {
          const transformed = zoomTransformRef.current.apply([
            selectedNode.x,
            selectedNode.y,
          ]);
          actionRef.current.style.transform = `translate(${transformed[0]}px, ${transformed[1]}px)`;
        }
      }
    }
  }, [actionRef, nodesByIdRef, selectedId, zoomTransformRef]);

  React.useEffect(() => {
    const countGroup = countGroupRef.current;
    if (!countGroup) return;
    countGroup.raise();
    countGroup.style("opacity", (node: GraphNode) =>
      node.id === hoveredId ? "1" : "0"
    );
  }, [hoveredId]);

  React.useEffect(() => {
    const countGroup = countGroupRef.current;
    if (!countGroup) return;
    countGroup.each(function (node) {
      const group = d3.select(this);
      group
        .selectAll<
          SVGTextElement,
          { key: keyof VertexItemCounts; label: string }
        >("text.graph-count-value")
        .text((entry) => {
          const counts = countsByIdRef.current[node.id];
          const value = counts ? counts[entry.key] : 0;
          return `${value}`;
        })
        .attr("opacity", (entry) => {
          const counts = countsByIdRef.current[node.id];
          const value = counts ? counts[entry.key] : 0;
          return value > 0 ? 1 : 0.55;
        });
      group
        .selectAll<
          SVGTextElement,
          { key: keyof VertexItemCounts; label: string }
        >("text.graph-count-label")
        .attr("opacity", (entry) => {
          const counts = countsByIdRef.current[node.id];
          const value = counts ? counts[entry.key] : 0;
          return value > 0 ? 0.9 : 0.45;
        });
      group
        .selectAll<SVGCircleElement, { key: keyof VertexItemCounts; label: string }>(
          "circle"
        )
        .attr("opacity", (entry) => {
          const counts = countsByIdRef.current[node.id];
          const value = counts ? counts[entry.key] : 0;
          return value > 0 ? 0.9 : 0.5;
        });
    });
  }, [countsByVertexId]);

  React.useEffect(() => {
    const nodeSelection = nodeSelectionRef.current;
    const nodeBackground = nodeBackgroundRef.current;
    if (!nodeSelection || !nodeBackground) return;
    nodeSelection
      .attr("r", (d: GraphNode) => {
        const base = getNodeRadius(d);
        const isSelected = d.id === selectedId;
        const isHovered = d.id === hoveredId;
        return base + (isSelected ? 6 : isHovered ? 3 : 0);
      })
      .style("fill", (d: GraphNode) => {
        if (d.kind === "vertex" && d.vertex?.thumbnail_path) {
          const sanitizeId = (value: string) =>
            value.replace(/[^a-zA-Z0-9_-]/g, "_");
          return `url(#thumb-${sanitizeId(d.id)})`;
        }
        return "var(--node-fill)";
      })
      .classed("graph-node-selected", (d: GraphNode) => d.id === currentVertexId)
      .attr("stroke", (d: GraphNode) =>
        d.id === currentVertexId
          ? theme.palette.warning.main
          : theme.palette.background.paper
      )
      .attr("stroke-width", (d: GraphNode) =>
        d.id === currentVertexId ? 3 : 1.5
      );
    nodeBackground.attr("r", (d: GraphNode) => {
      const base = getNodeRadius(d);
      const isSelected = d.id === selectedId;
      const isHovered = d.id === hoveredId;
      return base + (isSelected ? 6 : isHovered ? 3 : 0);
    });
  }, [currentVertexId, hoveredId, selectedId, theme]);

  return <svg ref={svgRef} />;
};
