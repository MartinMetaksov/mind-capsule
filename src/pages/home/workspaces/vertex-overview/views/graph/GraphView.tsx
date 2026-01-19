import * as React from "react";
import * as d3 from "d3";
import { Box, Typography, useTheme } from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import { useTranslation } from "react-i18next";

import type { Vertex } from "@/core/vertex";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { DeleteConfirmDialog } from "../../../components/delete-confirm-dialog/DeleteConfirmDialog";
import type { VertexItem } from "../../../vertices/vertex-grid/VertexGrid";
import { ACTION_RADIUS } from "./constants";
import type { GraphNode } from "./types";
import { GraphActionRing } from "./components/GraphActionRing";
import { GraphCanvas } from "./components/GraphCanvas";
import { GraphRecenterButton } from "./components/GraphRecenterButton";
import { useGraphData } from "./hooks/useGraphData";

export type GraphViewProps = {
  items: VertexItem[];
  currentVertex?: Vertex | null;
  onOpenVertex?: (vertexId: string) => void;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
};

export const GraphView: React.FC<GraphViewProps> = ({
  items: _items,
  currentVertex,
  onOpenVertex,
  onVertexUpdated,
}) => {
  const theme = useTheme();
  const { t } = useTranslation("common");
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const actionRef = React.useRef<HTMLDivElement | null>(null);
  const nodesByIdRef = React.useRef<Map<string, GraphNode>>(new Map());
  const zoomTransformRef = React.useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomBehaviorRef = React.useRef<
    d3.ZoomBehavior<SVGSVGElement, unknown> | null
  >(null);

  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [confirmRelocateOpen, setConfirmRelocateOpen] = React.useState(false);
  const [isPanned, setIsPanned] = React.useState(false);

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

  const { graphData, loading, error, setError, loadGraph } = useGraphData(
    _items
  );

  React.useEffect(() => {
    if (!graphData) return;
    nodesByIdRef.current = new Map(
      graphData.nodes.map((node) => [node.id, node])
    );
  }, [graphData]);

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
  }, [setError]);

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
  }, [currentVertexId, loadGraph, onOpenVertex, selectedNode, setError]);

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
  }, [currentVertex, loadGraph, onVertexUpdated, selectedNode, setError]);

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
      (
        window as unknown as {
          __vertexOverviewViewMode?: { mode: string; vertexId: string };
        }
      ).__vertexOverviewViewMode = {
        mode: "graph",
        vertexId: selectedNode.id,
      };
      (
        window as unknown as {
          __vertexOverviewOpenTab?: { tab: string; vertexId: string };
        }
      ).__vertexOverviewOpenTab = {
        tab: "items",
        vertexId: selectedNode.id,
      };
      window.sessionStorage.setItem(
        persistViewKey,
        JSON.stringify({ mode: "graph", vertexId: selectedNode.id })
      );
      window.sessionStorage.setItem(
        persistTabKey,
        JSON.stringify({ tab: "items", vertexId: selectedNode.id })
      );
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
  }, [onOpenVertex, persistTabKey, persistTransformKey, persistViewKey, selectedNode]);

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
  }, [persistTransformKey, updatePannedState]);

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
            ? "rgba(255, 196, 86)"
            : "rgba(255, 156, 0, 0.35)",
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
            animation: graphPulse 1.8s ease-in-out infinite;
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
          <Typography color="text.secondary">
            {t("graphView.loading")}
          </Typography>
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

      <GraphCanvas
        graphData={graphData}
        currentVertexId={currentVertexId}
        selectedId={selectedId}
        hoveredId={hoveredId}
        containerRef={containerRef}
        svgRef={svgRef}
        actionRef={actionRef}
        nodesByIdRef={nodesByIdRef}
        zoomTransformRef={zoomTransformRef}
        zoomBehaviorRef={zoomBehaviorRef}
        persistTransformKey={persistTransformKey}
        onSelectId={setSelectedId}
        onHoverId={setHoveredId}
        onPannedStateChange={updatePannedState}
      />

      <GraphActionRing
        key={selectedId ?? "none"}
        actionRef={actionRef}
        radius={ACTION_RADIUS}
        isOpen={Boolean(selectedNode)}
        sequenceKey={selectedId ?? "none"}
        actions={[
          {
            key: "open-vertex",
            label: t("graphView.actions.openVertex"),
            icon: <OpenInNewOutlinedIcon fontSize="small" />,
            angle: 225,
            onClick: handleOpenVertex,
            disabled: !canOpenVertex,
          },
          {
            key: "relocate",
            label: t("graphView.actions.relocateHere"),
            icon: <DriveFileMoveOutlinedIcon fontSize="small" />,
            angle: 255,
            onClick: () => setConfirmRelocateOpen(true),
            disabled: !canRelocate,
          },
          {
            key: "open",
            label: t("graphView.actions.openFolder"),
            icon: <FolderOpenOutlinedIcon fontSize="small" />,
            angle: 285,
            onClick: () => handleOpenPath(selectedNode?.path),
            disabled: !canOpen,
          },
          {
            key: "delete",
            label: t("graphView.actions.delete"),
            icon: <DeleteOutlineRoundedIcon fontSize="small" />,
            angle: 315,
            onClick: () => setConfirmDeleteOpen(true),
            disabled: !canDelete,
          },
        ]}
      />

      <GraphRecenterButton visible={isPanned} onClick={handleRecenter} />

      <DeleteConfirmDialog
        open={confirmDeleteOpen}
        title={t("graphView.dialogs.deleteTitle")}
        message={t("graphView.dialogs.deleteMessage", {
          label: selectedNode?.label ?? t("graphView.dialogs.thisItem"),
        })}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          setConfirmDeleteOpen(false);
          await handleDeleteVertex();
          setSelectedId(null);
        }}
      />
      <DeleteConfirmDialog
        open={confirmRelocateOpen}
        title={t("graphView.dialogs.relocateTitle")}
        message={t("graphView.dialogs.relocateMessage", {
          label: currentVertex?.title ?? t("graphView.dialogs.currentItem"),
        })}
        confirmLabel={t("graphView.dialogs.relocateConfirm")}
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
