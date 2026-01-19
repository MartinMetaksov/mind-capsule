import * as React from "react";
import * as d3 from "d3";
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CenterFocusStrongOutlinedIcon from "@mui/icons-material/CenterFocusStrongOutlined";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { DeleteConfirmDialog } from "../../../components/delete-confirm-dialog/DeleteConfirmDialog";
import type { VertexItem } from "../../../vertices/vertex-grid/VertexGrid";

type GraphViewProps = {
  items: VertexItem[];
  currentVertex?: Vertex | null;
  onOpenVertex?: (vertexId: string) => void;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
};

type GraphNodeKind = "root" | "workspace" | "vertex";

type GraphNode = d3.SimulationNodeDatum & {
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

type GraphLink = d3.SimulationLinkDatum<GraphNode> & {
  source: GraphNode | string;
  target: GraphNode | string;
  kind?: "anchor" | "edge";
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

const ACTION_RADIUS = 56;
const SELECTED_RING_RADIUS = 36;
const WORKSPACE_ANCHOR_ID = "__workspace_anchor__";

const getNodeRadius = (node: GraphNode) => {
  if (node.kind === "workspace") return 12;
  if (node.kind === "vertex") return 12;
  return 0;
};

export const GraphView: React.FC<GraphViewProps> = ({
  items: _items,
  currentVertex,
  onOpenVertex,
  onVertexUpdated,
}) => {
  const theme = useTheme();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const actionRef = React.useRef<HTMLDivElement | null>(null);
  const nodeSelectionRef = React.useRef<
    d3.Selection<SVGCircleElement, GraphNode, SVGGElement, unknown> | null
  >(null);
  const labelSelectionRef = React.useRef<
    d3.Selection<SVGTextElement, GraphNode, SVGGElement, unknown> | null
  >(null);
  const selectionRingRef = React.useRef<
    d3.Selection<SVGCircleElement, GraphNode, SVGGElement, unknown> | null
  >(null);
  const nodesByIdRef = React.useRef<Map<string, GraphNode>>(new Map());
  const selectedIdRef = React.useRef<string | null>(null);
  const zoomTransformRef = React.useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomBehaviorRef = React.useRef<
    d3.ZoomBehavior<SVGSVGElement, unknown> | null
  >(null);
  const simulationRef = React.useRef<
    d3.Simulation<GraphNode, GraphLink> | null
  >(null);
  const [graphData, setGraphData] = React.useState<GraphData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [confirmRelocateOpen, setConfirmRelocateOpen] = React.useState(false);
  const [isPanned, setIsPanned] = React.useState(false);

  React.useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const currentVertexId = currentVertex?.id ?? null;
  const persistViewKey = "vertexOverview.viewMode";
  const persistTransformKey = "vertexOverview.graphTransform";
  const persistTabKey = "vertexOverview.openTab";

  const updatePannedState = React.useCallback((transform: d3.ZoomTransform) => {
    const moved =
      Math.abs(transform.x) > 1 ||
      Math.abs(transform.y) > 1 ||
      Math.abs(transform.k - 1) > 0.01;
    setIsPanned(moved);
  }, []);

  const buildGraph = React.useCallback(
    (workspaces: Workspace[], vertices: Vertex[]): GraphData => {
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

      const vertexNodeById = new Map(
        vertexNodes.map((node) => [node.id, node])
      );

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
          return;
        }
        // Orphan vertices will float without a link.
      });

      // Seed positions to reduce crossings: place workspace roots above their descendants.
      const workspaceIndex = new Map(
        workspaces.map((ws, idx) => [ws.id, idx])
      );
      const workspaceCount = Math.max(1, workspaces.length);
      const columnGap = 260;
      vertexNodes.forEach((node) => {
        if (!node.workspaceId) return;
        const idx = workspaceIndex.get(node.workspaceId) ?? 0;
        const columnX = (idx - (workspaceCount - 1) / 2) * columnGap;
        node.x = columnX + (node.depth ?? 1) * 16;
        node.y = (node.depth ?? 1) * 110;
      });

      return { nodes, links };
    },
    []
  );

  const loadGraph = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const [workspaces, vertices] = await Promise.all([
        fs.getWorkspaces(),
        fs.getAllVertices(),
      ]);
      setGraphData(buildGraph(workspaces, vertices));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load graph.");
      setGraphData(null);
    } finally {
      setLoading(false);
    }
  }, [buildGraph]);

  React.useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const itemsKey = React.useMemo(
    () => _items.map((item) => item.vertex.id).join("|"),
    [_items]
  );

  React.useEffect(() => {
    loadGraph();
  }, [itemsKey, loadGraph]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(persistTransformKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { k: number; x: number; y: number };
      if (typeof parsed.k === "number") {
        zoomTransformRef.current = d3.zoomIdentity
          .translate(parsed.x ?? 0, parsed.y ?? 0)
          .scale(parsed.k ?? 1);
        updatePannedState(zoomTransformRef.current);
      }
    } catch {
      window.sessionStorage.removeItem(persistTransformKey);
    }
  }, [updatePannedState]);

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
      .attr("role", "img");

    const root = svg.append("g");

    const renderNodes = graphData.nodes.filter(
      (node) => node.id !== WORKSPACE_ANCHOR_ID
    );
    nodesByIdRef.current = new Map(
      graphData.nodes.map((node) => [node.id, node])
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

    const visibleLinks = graphData.links.filter((link) => link.kind !== "anchor");
    const link = root
      .append("g")
      .attr(
        "stroke",
        theme.palette.mode === "dark"
          ? "rgba(255, 255, 255, 0.28)"
          : theme.palette.divider
      )
      .attr("stroke-opacity", theme.palette.mode === "dark" ? 0.9 : 0.6)
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
      .on("mouseenter", (_event: MouseEvent, d: GraphNode) => {
        setHoveredId(d.id);
      })
      .on("mouseleave", () => setHoveredId(null))
      .on("click", (event: MouseEvent, d: GraphNode) => {
        event.stopPropagation();
        setSelectedId((prev) => (prev === d.id ? null : d.id));
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
      .text((d: GraphNode) => d.label);
    labelSelectionRef.current = label;

    svg.on("click", () => setSelectedId(null));

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
        updatePannedState(event.transform);
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
          .forceX((d: GraphNode) => {
            return d.targetX ?? width / 2;
          })
          .strength(0.25)
      )
      .force(
        "y",
        d3
          .forceY((d: GraphNode) => {
            return d.targetY ?? height / 2;
          })
          .strength(0.25)
      );

    simulation.on("tick", () => {
      link
        .attr("x1", (d: GraphLink) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d: GraphLink) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d: GraphLink) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d: GraphLink) => (d.target as GraphNode).y ?? 0);

      node
        .attr("cx", (d: GraphNode) => d.x ?? 0)
        .attr("cy", (d: GraphNode) => d.y ?? 0);

      label
        .attr("x", (d: GraphNode) => d.x ?? 0)
        .attr(
          "y",
          (d: GraphNode) =>
            (d.y ?? 0) +
            getNodeRadius(d) +
            (d.id === selectedIdRef.current ? 36 : 14)
        );

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
          actionRef.current.style.opacity = "1";
          actionRef.current.style.pointerEvents = "auto";
        }
      } else if (actionRef.current) {
        actionRef.current.style.opacity = "0";
        actionRef.current.style.pointerEvents = "none";
      }

      if (selectedIdRef.current) {
        const selectedNode = nodesByIdRef.current.get(
          selectedIdRef.current
        );
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

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [currentVertexId, graphData, theme, updatePannedState]);

  React.useEffect(() => {
    const labels = labelSelectionRef.current;
    if (labels) {
      labels.attr(
        "y",
        (d: GraphNode) =>
          (d.y ?? 0) +
          getNodeRadius(d) +
          (d.id === selectedId ? 36 : 14)
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
          actionRef.current.style.opacity = "1";
          actionRef.current.style.pointerEvents = "auto";
        }
      } else {
        actionRef.current.style.opacity = "0";
        actionRef.current.style.pointerEvents = "none";
      }
    }
  }, [selectedId]);

  React.useEffect(() => {
    const nodeSelection = nodeSelectionRef.current;
    if (!nodeSelection) return;
    nodeSelection
      .attr("r", (d: GraphNode) => {
        const base = getNodeRadius(d);
        const isSelected = d.id === selectedId;
        const isHovered = d.id === hoveredId;
        return base + (isSelected ? 6 : isHovered ? 3 : 0);
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
  }, [currentVertexId, hoveredId, selectedId, theme]);

  const selectedNode = selectedId
    ? nodesByIdRef.current.get(selectedId)
    : null;

  const handleOpenPath = React.useCallback(async (path?: string | null) => {
    if (!path) return;
    try {
      const { isTauri, invoke } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        await invoke("fs_open_path", { path });
        return;
      }
      window.open(encodeURI(`file://${path}`), "_blank", "noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open folder.");
    }
  }, []);

  const handleDeleteVertex = React.useCallback(async () => {
    if (!selectedNode || selectedNode.kind !== "vertex" || !selectedNode.vertex) {
      return;
    }
    try {
      const fs = await getFileSystem();
      await fs.removeVertex(selectedNode.vertex);
      if (currentVertexId && selectedNode.id === currentVertexId) {
        const parentId = selectedNode.vertex.parent_id ?? null;
        if (parentId) onOpenVertex?.(parentId);
      }
      setSelectedId(null);
      await loadGraph();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete vertex.");
    }
  }, [currentVertexId, loadGraph, onOpenVertex, selectedNode]);

  const handleRelocate = React.useCallback(async () => {
    if (!selectedNode || !currentVertex) return;
    if (selectedNode.id === currentVertex.id) return;
    try {
      const fs = await getFileSystem();
      let updated: Vertex;
      if (selectedNode.kind === "workspace" && selectedNode.workspace) {
        updated = {
          ...currentVertex,
          parent_id: null,
          workspace_id: selectedNode.workspace.id,
          updated_at: new Date().toISOString(),
        };
      } else if (selectedNode.kind === "vertex" && selectedNode.vertex) {
        updated = {
          ...currentVertex,
          parent_id: selectedNode.vertex.id,
          workspace_id: selectedNode.vertex.workspace_id ?? null,
          updated_at: new Date().toISOString(),
        };
      } else {
        return;
      }
      await fs.updateVertex(updated);
      await onVertexUpdated?.(updated);
      setSelectedId(null);
      await loadGraph();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to relocate vertex.");
    }
  }, [currentVertex, loadGraph, onVertexUpdated, selectedNode]);

  const canOpen = Boolean(selectedNode?.path);
  const canDelete = Boolean(selectedNode?.kind === "vertex");
  const canOpenVertex = Boolean(
    selectedNode?.kind === "vertex" &&
      selectedNode?.vertex &&
      selectedNode.id !== currentVertexId
  );
  const canRelocate =
    Boolean(currentVertex) &&
    Boolean(selectedNode) &&
    selectedNode?.id !== currentVertex?.id;

  const handleOpenVertex = React.useCallback(() => {
    if (!selectedNode || selectedNode.kind !== "vertex") return;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(persistViewKey, "graph");
      window.sessionStorage.setItem(persistTabKey, "items");
      window.sessionStorage.setItem(
        persistTransformKey,
        JSON.stringify({
          k: zoomTransformRef.current.k,
          x: zoomTransformRef.current.x,
          y: zoomTransformRef.current.y,
        })
      );
    }
    onOpenVertex?.(selectedNode.id);
  }, [onOpenVertex, selectedNode]);

  const handleRecenter = React.useCallback(() => {
    const svg = svgRef.current;
    const zoom = zoomBehaviorRef.current;
    if (!svg || !zoom) return;
    const selection = d3.select(svg);
    selection.call(zoom.transform, d3.zoomIdentity);
    zoomTransformRef.current = d3.zoomIdentity;
    updatePannedState(d3.zoomIdentity);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(persistTransformKey);
    }
  }, [updatePannedState]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: "relative",
        height: "100%",
        minHeight: 0,
        width: "100%",
        overflow: "hidden",
        "--graph-pulse-stroke": theme.palette.warning.main,
        "--graph-pulse-fill": theme.palette.warning.main,
        "--graph-pulse-fill-alt": theme.palette.warning.light,
        "--graph-pulse-glow":
          theme.palette.mode === "dark"
            ? "rgba(255, 196, 86, 0.65)"
            : "rgba(255, 156, 0, 0.45)",
      }}
      data-testid="vertex-overview-graph"
    >
      <style>
        {`
          @keyframes graphPulse {
            0% {
              stroke: var(--graph-pulse-stroke);
              fill: var(--node-fill);
              filter: drop-shadow(0 0 0 var(--graph-pulse-glow));
            }
            50% {
              stroke: var(--graph-pulse-stroke);
              fill: var(--node-fill-alt);
              filter: drop-shadow(0 0 8px var(--graph-pulse-glow));
            }
            100% {
              stroke: var(--graph-pulse-stroke);
              fill: var(--node-fill);
              filter: drop-shadow(0 0 0 var(--graph-pulse-glow));
            }
          }

          .graph-node-selected {
            animation: graphPulse 1.6s ease-in-out infinite;
          }

          .graph-node {
            fill: var(--node-fill);
          }

        `}
      </style>
      {loading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
            bgcolor: "background.default",
            opacity: 0.7,
          }}
        >
          <Typography color="text.secondary">Loading graph…</Typography>
        </Box>
      )}
      {error && (
        <Box
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            zIndex: 2,
          }}
        >
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        </Box>
      )}

      <svg ref={svgRef} />

      <Box
        ref={actionRef}
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "translate(-9999px, -9999px)",
          pointerEvents: "none",
          zIndex: 3,
        }}
      >
        <Box sx={{ position: "relative", width: 0, height: 0 }}>
          {[
            {
              key: "open-vertex",
              label: "Open vertex",
              icon: <OpenInNewOutlinedIcon fontSize="small" />,
              angle: 225,
              onClick: handleOpenVertex,
              disabled: !canOpenVertex,
            },
            {
              key: "relocate",
              label: "Relocate here",
              icon: <DriveFileMoveOutlinedIcon fontSize="small" />,
              angle: 255,
              onClick: () => setConfirmRelocateOpen(true),
              disabled: !canRelocate,
            },
            {
              key: "open",
              label: "Open folder",
              icon: <FolderOpenOutlinedIcon fontSize="small" />,
              angle: 285,
              onClick: () => handleOpenPath(selectedNode?.path),
              disabled: !canOpen,
            },
            {
              key: "delete",
              label: "Delete",
              icon: <DeleteOutlineRoundedIcon fontSize="small" />,
              angle: 315,
              onClick: () => setConfirmDeleteOpen(true),
              disabled: !canDelete,
            },
          ].map((action) => {
            const radians = (action.angle * Math.PI) / 180;
            const left = Math.cos(radians) * ACTION_RADIUS;
            const top = Math.sin(radians) * ACTION_RADIUS;
            return (
              <Tooltip
                key={action.key}
                title={action.label}
                placement="right"
                followCursor
              >
                <span>
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      left,
                      top,
                      transform: "translate(-50%, -50%)",
                      bgcolor: "background.paper",
                    }}
                    onClick={() => {
                      action.onClick();
                    }}
                    disabled={action.disabled}
                    aria-label={action.label}
                  >
                    {action.icon}
                  </IconButton>
                </span>
              </Tooltip>
            );
          })}
        </Box>
      </Box>

      {isPanned && (
        <Box
          sx={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 3,
          }}
        >
          <Tooltip title="Recenter graph" placement="left">
            <IconButton
              size="small"
              sx={{ bgcolor: "background.paper" }}
              onClick={handleRecenter}
              aria-label="Recenter graph"
            >
              <CenterFocusStrongOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <DeleteConfirmDialog
        open={confirmDeleteOpen}
        title="Delete vertex"
        message={`Delete ${selectedNode?.label ?? "this item"}?`}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          setConfirmDeleteOpen(false);
          await handleDeleteVertex();
          setSelectedId(null);
        }}
      />
      <DeleteConfirmDialog
        open={confirmRelocateOpen}
        title="Relocate vertex"
        message={`Relocate ${currentVertex?.title ?? "current item"} here?`}
        confirmLabel="Relocate"
        confirmColor="primary"
        onCancel={() => setConfirmRelocateOpen(false)}
        onConfirm={async () => {
          setConfirmRelocateOpen(false);
          await handleRelocate();
          setSelectedId(null);
        }}
      />

    </Box>
  );
};
