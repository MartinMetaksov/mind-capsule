import * as React from "react";
import * as d3 from "d3";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Tooltip,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useTranslation } from "react-i18next";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { DeleteConfirmDialog } from "../../../components/delete-confirm-dialog/DeleteConfirmDialog";
import type { VertexItem } from "../grid/VertexGrid";
import { ACTION_RADIUS } from "./constants";
import type { GraphNode } from "./types";
import { GraphActionRing } from "./components/GraphActionRing";
import { GraphCanvas } from "./components/GraphCanvas";
import { GraphRecenterButton } from "./components/GraphRecenterButton";
import { useGraphData } from "./hooks/useGraphData";
import { useGraphCollapse } from "./hooks/useGraphCollapse";
import { useGraphCounts } from "./hooks/useGraphCounts";

export type GraphViewProps = {
  items: VertexItem[];
  currentVertex?: Vertex | null;
  currentWorkspace?: Workspace | null;
  onOpenVertex?: (vertexId: string) => void;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
};

export const GraphView: React.FC<GraphViewProps> = ({
  items: _items,
  currentVertex,
  currentWorkspace,
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
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [isPanned, setIsPanned] = React.useState(false);
  const [moveState, setMoveState] = React.useState<{
    stage: "scan" | "move";
    moved: number;
    total: number;
    current?: string;
    workspaceName?: string;
  } | null>(null);

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

  const defaultCollapsedIds = React.useMemo(() => {
    if (!graphData) return null;
    if (!currentVertexId) return new Set<string>();
    const nodesById = new Map(graphData.nodes.map((node) => [node.id, node]));
    const currentNode = nodesById.get(currentVertexId);
    const currentWorkspaceId =
      currentVertex?.workspace_id ??
      currentWorkspace?.id ??
      currentNode?.workspaceId ??
      null;

    let rootProjectId: string | null = currentNode?.id ?? null;
    while (rootProjectId) {
      const node = nodesById.get(rootProjectId);
      if (!node || node.kind !== "vertex" || !node.parentId) break;
      rootProjectId = node.parentId;
    }

    const collapsed = new Set<string>();
    graphData.nodes.forEach((node) => {
      if (node.kind === "workspace") {
        if (
          currentWorkspaceId &&
          node.workspaceId &&
          node.workspaceId !== currentWorkspaceId
        ) {
          collapsed.add(node.id);
        }
      }
    });
    graphData.nodes.forEach((node) => {
      if (node.kind === "vertex" && !node.parentId) {
        if (rootProjectId && node.id !== rootProjectId) {
          if (!currentWorkspaceId || node.workspaceId === currentWorkspaceId) {
            collapsed.add(node.id);
          }
        }
      }
    });
    return collapsed;
  }, [currentVertexId, currentVertex?.workspace_id, currentWorkspace?.id, graphData]);

  const { collapsedIds, toggleCollapse, visibleGraphData } =
    useGraphCollapse(graphData, { defaultCollapsedIds });

  const { countsByVertexId } = useGraphCounts(graphData ?? null);

  React.useEffect(() => {
    if (!visibleGraphData) return;
    nodesByIdRef.current = new Map(
      visibleGraphData.nodes.map((node) => [node.id, node])
    );
  }, [visibleGraphData]);

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

  React.useEffect(() => {
    if (!selectedId || !visibleGraphData) return;
    const exists = visibleGraphData.nodes.some((node) => node.id === selectedId);
    if (!exists) {
      setSelectedId(null);
    }
  }, [selectedId, visibleGraphData]);

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

  const buildAssetDirectory = React.useCallback(
    (workspacePath: string, vertexId: string) => {
      const trimmed = workspacePath.replace(/[\\/]+$/, "");
      return `${trimmed}/${vertexId}`;
    },
    []
  );

  const moveDirectoryWithProgress = React.useCallback(
    async (
      sourceDir: string,
      targetDir: string,
      onProgress: (progress: {
        stage: "scan" | "move";
        moved: number;
        total: number;
        current?: string;
      }) => void
    ) => {
      const { readDir, readFile, writeFile, remove, mkdir } = await import(
        "@tauri-apps/plugin-fs"
      );
      const { join } = await import("@tauri-apps/api/path");

      const walk = async (
        dir: string
      ): Promise<{ files: string[]; dirs: string[] }> => {
        const entries = await readDir(dir);
        const files: string[] = [];
        const dirs: string[] = [];
        for (const entry of entries) {
          const entryPath = entry.name ? await join(dir, entry.name) : null;
          if (!entryPath) continue;
          if (entry.isDirectory) {
            dirs.push(entryPath);
            const nested = await walk(entryPath);
            files.push(...nested.files);
            dirs.push(...nested.dirs);
          } else {
            files.push(entryPath);
          }
        }
        return { files, dirs };
      };

      const { files, dirs } = await walk(sourceDir);
      onProgress({ stage: "scan", moved: 0, total: files.length });

      await mkdir(targetDir, { recursive: true });
      const sortedDirs = dirs.sort((a, b) => a.length - b.length);
      for (const dir of sortedDirs) {
        const rel = dir.slice(sourceDir.length + 1);
        if (!rel) continue;
        const dest = await join(targetDir, rel);
        await mkdir(dest, { recursive: true });
      }

      let moved = 0;
      for (const file of files) {
        const rel = file.slice(sourceDir.length + 1);
        const dest = await join(targetDir, rel);
        const data = await readFile(file);
        await writeFile(dest, data);
        await remove(file);
        moved += 1;
        onProgress({ stage: "move", moved, total: files.length, current: rel });
      }

      await remove(sourceDir, { recursive: true });
    },
    []
  );

  const handleRelocate = React.useCallback(async () => {
    if (!selectedNode || !currentVertex) return;
    if (selectedNode.id === currentVertex.id) return;
    try {
      const fs = await getFileSystem();
      let updated: Vertex;
      if (selectedNode.kind === "workspace" && selectedNode.workspace) {
        let nextAssetDirectory = currentVertex.asset_directory;
        const { isTauri } = await import("@tauri-apps/api/core");
        if (isTauri() && selectedNode.workspace.path) {
          const targetDir = buildAssetDirectory(
            selectedNode.workspace.path,
            currentVertex.id
          );
          const sourceDir =
            currentVertex.asset_directory ||
            (currentWorkspace?.path
              ? buildAssetDirectory(currentWorkspace.path, currentVertex.id)
              : "");
          const shouldMove = Boolean(sourceDir) && targetDir !== sourceDir;
          if (shouldMove) {
            setMoveState({
              stage: "scan",
              moved: 0,
              total: 0,
              workspaceName: selectedNode.workspace.name,
            });
            await moveDirectoryWithProgress(
              sourceDir,
              targetDir,
              (progress) =>
                setMoveState((prev) => (prev ? { ...prev, ...progress } : prev))
            );
          }
          nextAssetDirectory = targetDir;
        }
        updated = {
          ...currentVertex,
          parent_id: null,
          workspace_id: selectedNode.workspace.id,
          asset_directory: nextAssetDirectory,
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
      setMoveState(null);
      setSelectedId(null);
      await loadGraph();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to relocate vertex.");
      setMoveState(null);
    }
  }, [
    buildAssetDirectory,
    currentVertex,
    currentWorkspace,
    loadGraph,
    moveDirectoryWithProgress,
    onVertexUpdated,
    selectedNode,
    setError,
  ]);

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

      <Dialog
        open={Boolean(moveState)}
        disableEscapeKeyDown
        onClose={() => undefined}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("graphView.move.title")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              {moveState?.workspaceName
                ? t("graphView.move.subtitle", {
                    workspace: moveState.workspaceName,
                  })
                : t("graphView.move.subtitleFallback")}
            </Typography>
            {moveState?.stage === "move" && moveState.total > 0 ? (
              <>
                <LinearProgress
                  variant="determinate"
                  value={Math.round((moveState.moved / moveState.total) * 100)}
                />
                <Typography color="text.secondary">
                  {t("graphView.move.progress", {
                    moved: moveState.moved,
                    total: moveState.total,
                  })}
                </Typography>
                {moveState.current && (
                  <Typography color="text.secondary" noWrap>
                    {moveState.current}
                  </Typography>
                )}
              </>
            ) : (
              <>
                <LinearProgress />
                <Typography color="text.secondary">
                  {t("graphView.move.scanning")}
                </Typography>
              </>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      <GraphCanvas
        graphData={visibleGraphData}
        currentVertexId={currentVertexId}
        selectedId={selectedId}
        hoveredId={hoveredId}
        countsByVertexId={countsByVertexId}
        collapsedIds={collapsedIds}
        onToggleCollapse={toggleCollapse}
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

      <Tooltip title={t("graphView.help.tooltip")} placement="right">
        <IconButton
          size="small"
          onClick={() => setHelpOpen(true)}
          aria-label={t("graphView.help.tooltip")}
          sx={{
            position: "absolute",
            bottom: 20,
            left: 20,
            bgcolor: "background.paper",
            boxShadow: 1,
          }}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

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

      <Dialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("graphView.help.title")}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5, pb: 1 }}>
            <Typography color="text.secondary">
              {t("graphView.help.intro")}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {t("graphView.help.sections.expand")}
            </Typography>
            <Typography color="text.secondary">
              {t("graphView.help.expandCollapse")}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {t("graphView.help.sections.defaults")}
            </Typography>
            <Typography color="text.secondary">
              {t("graphView.help.defaults")}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {t("graphView.help.sections.navigation")}
            </Typography>
            <Typography color="text.secondary">
              {t("graphView.help.navigation")}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {t("graphView.help.sections.pan")}
            </Typography>
            <Typography color="text.secondary">
              {t("graphView.help.pan")}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {t("graphView.help.sections.badges")}
            </Typography>
            <Typography color="text.secondary">
              {t("graphView.help.badges")}
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
