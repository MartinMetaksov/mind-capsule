import * as React from "react";
import * as d3 from "d3";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Box,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import type { Vertex } from "@/core/vertex";
import type {
  ImageEntry,
  NoteEntry,
} from "@/integrations/fileSystem/fileSystem";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import type { VertexItem } from "../../grid/VertexGrid";
import type { GraphNode } from "../types";
import { GraphCanvas } from "./GraphCanvas";
import { GraphActionRing, type GraphAction } from "./GraphActionRing";
import { GraphRecenterButton } from "./GraphRecenterButton";
import { ACTION_RADIUS } from "../constants";
import { useGraphData } from "../hooks/useGraphData";

type GraphReferenceModalProps = {
  open: boolean;
  items: VertexItem[];
  onClose: () => void;
  onSelectVertex?: (node: GraphNode) => void;
  onSelectNote?: (note: NoteEntry, vertex: Vertex) => void;
  onSelectImage?: (image: ImageEntry, vertex: Vertex) => void;
  onSelectFile?: (file: { name: string; path: string }, vertex: Vertex) => void;
};

type RailTab = "notes" | "images" | "files";

type FileEntry = {
  name: string;
  path: string;
};

export const GraphReferenceModal: React.FC<GraphReferenceModalProps> = ({
  open,
  items,
  onClose,
  onSelectVertex,
  onSelectNote,
  onSelectImage,
  onSelectFile,
}) => {
  const { t } = useTranslation("common");
  const theme = useTheme();
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
  const [isPanned, setIsPanned] = React.useState(false);
  const [railTab, setRailTab] = React.useState<RailTab>("notes");
  const [railOpen, setRailOpen] = React.useState(false);
  const [railLoading, setRailLoading] = React.useState(false);
  const [railError, setRailError] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState<NoteEntry[]>([]);
  const [images, setImages] = React.useState<ImageEntry[]>([]);
  const [files, setFiles] = React.useState<FileEntry[]>([]);
  const railTransformRef = React.useRef<d3.ZoomTransform | null>(null);
  const handleClose = React.useCallback(() => {
    onClose();
    setRailOpen(false);
    setRailError(null);
    setRailLoading(false);
  }, [onClose]);

  const { graphData, loading, error } = useGraphData(items);

  React.useEffect(() => {
    if (!graphData) return;
    nodesByIdRef.current = new Map(
      graphData.nodes.map((node) => [node.id, node])
    );
  }, [graphData]);

  React.useEffect(() => {
    if (!open) {
      setSelectedId(null);
    }
  }, [open]);

  React.useEffect(() => {
    setRailOpen(false);
  }, [selectedId]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (railOpen) {
          setRailOpen(false);
          return;
        }
        handleClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClose, open, railOpen]);

  const selectedNode = selectedId
    ? nodesByIdRef.current.get(selectedId) ?? null
    : null;
  const selectedVertex = selectedNode?.vertex ?? null;
  const isVertexSelected = selectedNode?.kind === "vertex" && selectedVertex;

  const updatePannedState = React.useCallback((transform: d3.ZoomTransform) => {
    const moved =
      Math.abs(transform.x) > 1 ||
      Math.abs(transform.y) > 1 ||
      Math.abs(transform.k - 1) > 0.01;
    setIsPanned(moved);
  }, []);

  const handleRecenter = React.useCallback(() => {
    const svg = svgRef.current;
    const zoom = zoomBehaviorRef.current;
    if (!svg || !zoom) return;
    const selection = d3.select(svg);
    selection.call(zoom.transform, d3.zoomIdentity);
    zoomTransformRef.current = d3.zoomIdentity;
    updatePannedState(d3.zoomIdentity);
  }, [updatePannedState]);

  React.useEffect(() => {
    if (!railOpen || !selectedNode) return;
    const container = containerRef.current;
    const zoom = zoomBehaviorRef.current;
    const svg = svgRef.current;
    if (!container || !zoom || !svg) return;
    if (selectedNode.x == null || selectedNode.y == null) return;

    const railWidth = 320;
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;

    if (!railTransformRef.current) {
      railTransformRef.current = zoomTransformRef.current ?? d3.zoomIdentity;
    }

    const availableWidth = Math.max(0, width - railWidth);
    const targetX = availableWidth / 2;
    const targetY = height / 2;
    const current = zoomTransformRef.current ?? d3.zoomIdentity;
    const next = d3.zoomIdentity
      .translate(
        targetX - selectedNode.x * current.k,
        targetY - selectedNode.y * current.k
      )
      .scale(current.k);

    const selection = d3.select(svg);
    selection.transition().duration(240).call(zoom.transform, next);
    zoomTransformRef.current = next;
    updatePannedState(next);
    if (actionRef.current) {
      const transformed = next.apply([selectedNode.x, selectedNode.y]);
      actionRef.current.style.transition = "transform 240ms ease";
      actionRef.current.style.transform = `translate(${transformed[0]}px, ${transformed[1]}px)`;
    }
  }, [
    railOpen,
    selectedNode,
    containerRef,
    svgRef,
    zoomBehaviorRef,
    zoomTransformRef,
    updatePannedState,
  ]);

  React.useEffect(() => {
    if (railOpen) return;
    const previous = railTransformRef.current;
    if (!previous) return;
    const svg = svgRef.current;
    const zoom = zoomBehaviorRef.current;
    if (!svg || !zoom) return;

    const selection = d3.select(svg);
    selection.transition().duration(240).call(zoom.transform, previous);
    zoomTransformRef.current = previous;
    updatePannedState(previous);
    railTransformRef.current = null;

    if (actionRef.current && selectedNode?.x != null && selectedNode?.y != null) {
      const transformed = previous.apply([selectedNode.x, selectedNode.y]);
      actionRef.current.style.transition = "transform 240ms ease";
      actionRef.current.style.transform = `translate(${transformed[0]}px, ${transformed[1]}px)`;
    }
  }, [
    railOpen,
    selectedNode,
    svgRef,
    zoomBehaviorRef,
    zoomTransformRef,
    updatePannedState,
  ]);

  const actions = React.useMemo<GraphAction[]>(() => {
    const vertexNode = selectedNode ?? null;
    const isVertex = selectedNode?.kind === "vertex";
    return [
      {
        key: "link-vertex",
        label: t("graphReferenceModal.actions.vertex"),
        icon: <AccountTreeOutlinedIcon fontSize="small" />,
        angle: 225,
        onClick: () => {
          if (!vertexNode || !onSelectVertex) return;
          onSelectVertex(vertexNode);
          handleClose();
        },
        disabled: !isVertex,
      },
      {
        key: "link-note",
        label: t("graphReferenceModal.actions.note"),
        icon: <CommentOutlinedIcon fontSize="small" />,
        angle: 255,
        onClick: () => {
          if (!isVertex) return;
          setRailTab("notes");
          setRailOpen(true);
        },
        disabled: !isVertex,
      },
      {
        key: "link-image",
        label: t("graphReferenceModal.actions.image"),
        icon: <ImageOutlinedIcon fontSize="small" />,
        angle: 285,
        onClick: () => {
          if (!isVertex) return;
          setRailTab("images");
          setRailOpen(true);
        },
        disabled: !isVertex,
      },
      {
        key: "link-file",
        label: t("graphReferenceModal.actions.file"),
        icon: <InsertDriveFileOutlinedIcon fontSize="small" />,
        angle: 315,
        onClick: () => {
          if (!isVertex) return;
          setRailTab("files");
          setRailOpen(true);
        },
        disabled: !isVertex,
      },
    ];
  }, [handleClose, onSelectVertex, selectedNode, t]);

  React.useEffect(() => {
    if (!open || !isVertexSelected) {
      setNotes([]);
      setImages([]);
      setFiles([]);
      setRailError(null);
      setRailLoading(false);
      return;
    }
    if (!railOpen) return;
    let active = true;
    const loadRail = async () => {
      setRailLoading(true);
      setRailError(null);
      try {
        const fs = await getFileSystem();
        const [notesList, imagesList, filesList] = await Promise.all([
          fs.listNotes(selectedVertex),
          fs.listImages(selectedVertex),
          loadFiles(selectedVertex),
        ]);
        if (!active) return;
        setNotes(notesList);
        setImages(imagesList);
        setFiles(filesList);
      } catch (err) {
        if (!active) return;
        setRailError(
          err instanceof Error ? err.message : t("graphReferenceModal.errors.load")
        );
      } finally {
        if (active) setRailLoading(false);
      }
    };
    loadRail();
    return () => {
      active = false;
    };
  }, [isVertexSelected, open, railOpen, selectedVertex, t]);

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        bgcolor: "background.default",
        zIndex: 7,
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
        overflow: "hidden",
        animation: "notesSlideIn 180ms ease",
        "@keyframes notesSlideIn": {
          from: { opacity: 0, transform: "translateX(-20px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5 }}>
        <IconButton
          aria-label={t("graphReferenceModal.close")}
          onClick={handleClose}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {t("graphReferenceModal.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("graphReferenceModal.subtitle")}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, position: "relative" }}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            zIndex: 1,
            pointerEvents: "auto",
          }}
        >
          {loading && (
            <Typography color="text.secondary" sx={{ px: 2, pt: 1 }}>
              {t("graphView.loading")}
            </Typography>
          )}
          {error && (
            <Typography color="error" sx={{ px: 2, pt: 1 }}>
              {error}
            </Typography>
          )}

          <Box
            ref={containerRef}
            sx={{
              position: "absolute",
              inset: 0,
              "--graph-pulse-stroke": theme.palette.warning.main,
              "--graph-pulse-fill": theme.palette.warning.main,
              "--graph-pulse-fill-alt": theme.palette.warning.light,
              "--graph-pulse-glow":
                theme.palette.mode === "dark"
                  ? "rgba(255, 196, 86)"
                  : "rgba(255, 156, 0, 0.35)",
            }}
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
            <GraphCanvas
              graphData={graphData}
              currentVertexId={null}
              selectedId={selectedId}
              hoveredId={hoveredId}
              containerRef={containerRef}
              svgRef={svgRef}
              actionRef={actionRef}
              nodesByIdRef={nodesByIdRef}
              zoomTransformRef={zoomTransformRef}
              zoomBehaviorRef={zoomBehaviorRef}
              persistTransformKey="vertexOverview.graphReferenceTransform"
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
              actions={actions}
            />
            <GraphRecenterButton visible={isPanned} onClick={handleRecenter} />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          width: 320,
          borderLeft: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 2,
          pointerEvents: railOpen ? "auto" : "none",
          transform: railOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 180ms ease",
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton
              size="small"
              onClick={() => setRailOpen(false)}
              aria-label={t("graphReferenceModal.close")}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {isVertexSelected
                ? selectedNode?.label
                : t("graphReferenceModal.rail.emptyTitle")}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {isVertexSelected
              ? t("graphReferenceModal.rail.emptyHint")
              : t("graphReferenceModal.rail.emptySelect")}
          </Typography>
          {isVertexSelected && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", pt: 1 }}
            >
              {railTab === "notes"
                ? t("graphReferenceModal.tabs.notes")
                : railTab === "images"
                  ? t("graphReferenceModal.tabs.images")
                  : t("graphReferenceModal.tabs.files")}
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2 }}>
          {!isVertexSelected && (
            <Typography color="text.secondary">
              {t("graphReferenceModal.rail.emptySelect")}
            </Typography>
          )}
          {isVertexSelected && railLoading && (
            <Typography color="text.secondary">
              {t("graphReferenceModal.rail.loading")}
            </Typography>
          )}
          {isVertexSelected && railError && (
            <Typography color="error">{railError}</Typography>
          )}
          {isVertexSelected && !railLoading && !railError && railTab === "notes" && (
            <Stack spacing={1}>
              {notes.length === 0 ? (
                <Typography color="text.secondary">
                  {t("graphReferenceModal.rail.emptyNotes")}
                </Typography>
              ) : (
                notes.map((note) => (
                  <Box
                    key={note.name}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      border: `1px solid ${theme.palette.divider}`,
                      cursor: "pointer",
                      transition: "background-color 150ms ease, border-color 150ms ease",
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                        borderColor: theme.palette.text.secondary,
                      },
                      pointerEvents: "auto",
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={note.name}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => {
                      const vertexForLink =
                        selectedVertex ??
                        (selectedNode?.kind === "vertex"
                          ? ({ id: selectedNode.id } as Vertex)
                          : null);
                      if (!vertexForLink) return;
                      onSelectNote?.(note, vertexForLink);
                      handleClose();
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      const vertexForLink =
                        selectedVertex ??
                        (selectedNode?.kind === "vertex"
                          ? ({ id: selectedNode.id } as Vertex)
                          : null);
                      if (!vertexForLink) return;
                      onSelectNote?.(note, vertexForLink);
                      handleClose();
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {note.name.replace(/\.md$/i, "")}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {note.text || t("graphReferenceModal.rail.emptyNote")}
                    </Typography>
                  </Box>
                ))
              )}
            </Stack>
          )}
          {isVertexSelected && !railLoading && !railError && railTab === "images" && (
            <Stack spacing={1}>
              {images.length === 0 ? (
                <Typography color="text.secondary">
                  {t("graphReferenceModal.rail.emptyImages")}
                </Typography>
              ) : (
                images.map((image) => (
                  <Box
                    key={image.name}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1,
                      borderRadius: 1.5,
                      border: `1px solid ${theme.palette.divider}`,
                      cursor: "pointer",
                      transition: "background-color 150ms ease, border-color 150ms ease",
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                        borderColor: theme.palette.text.secondary,
                      },
                      pointerEvents: "auto",
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={image.alt || image.name}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => {
                      const vertexForLink =
                        selectedVertex ??
                        (selectedNode?.kind === "vertex"
                          ? ({ id: selectedNode.id } as Vertex)
                          : null);
                      if (!vertexForLink) return;
                      onSelectImage?.(image, vertexForLink);
                      handleClose();
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      const vertexForLink =
                        selectedVertex ??
                        (selectedNode?.kind === "vertex"
                          ? ({ id: selectedNode.id } as Vertex)
                          : null);
                      if (!vertexForLink) return;
                      onSelectImage?.(image, vertexForLink);
                      handleClose();
                    }}
                  >
                    <Box
                      component="img"
                      src={image.path}
                      alt={image.alt ?? image.name}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        objectFit: "cover",
                      }}
                    />
                    <Typography variant="body2">
                      {image.alt || image.name}
                    </Typography>
                  </Box>
                ))
              )}
            </Stack>
          )}
          {isVertexSelected && !railLoading && !railError && railTab === "files" && (
            <Stack spacing={1}>
              {files.length === 0 ? (
                <Typography color="text.secondary">
                  {t("graphReferenceModal.rail.emptyFiles")}
                </Typography>
              ) : (
                files.map((file) => (
                  <Box
                    key={file.path}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1,
                      borderRadius: 1.5,
                      border: `1px solid ${theme.palette.divider}`,
                      cursor: "pointer",
                      transition: "background-color 150ms ease, border-color 150ms ease",
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                        borderColor: theme.palette.text.secondary,
                      },
                      pointerEvents: "auto",
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={file.name}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => {
                      const vertexForLink =
                        selectedVertex ??
                        (selectedNode?.kind === "vertex"
                          ? ({ id: selectedNode.id } as Vertex)
                          : null);
                      if (!vertexForLink) return;
                      onSelectFile?.(file, vertexForLink);
                      handleClose();
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      const vertexForLink =
                        selectedVertex ??
                        (selectedNode?.kind === "vertex"
                          ? ({ id: selectedNode.id } as Vertex)
                          : null);
                      if (!vertexForLink) return;
                      onSelectFile?.(file, vertexForLink);
                      handleClose();
                    }}
                  >
                    <InsertDriveFileOutlinedIcon fontSize="small" />
                    <Typography variant="body2">{file.name}</Typography>
                  </Box>
                ))
              )}
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "tiff",
  "svg",
];

const EXCLUDED_EXTENSIONS = ["json", "md"];

const getExtension = (name: string) => {
  const parts = name.split(".");
  if (parts.length <= 1) return "";
  return (parts.pop() ?? "").toLowerCase();
};

const isExcludedName = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith(".")) return true;
  const ext = getExtension(trimmed);
  if (EXCLUDED_EXTENSIONS.includes(ext)) return true;
  return IMAGE_EXTENSIONS.includes(ext);
};

const loadFiles = async (vertex: Vertex): Promise<FileEntry[]> => {
  const { isTauri } = await import("@tauri-apps/api/core");
  if (!isTauri()) return [];
  const [{ readDir }, { join }] = await Promise.all([
    import("@tauri-apps/plugin-fs"),
    import("@tauri-apps/api/path"),
  ]);
  const entries = await readDir(vertex.asset_directory);
  const files = await Promise.all(
    entries
      .filter((entry) => !entry.isDirectory)
      .filter((entry) => !isExcludedName(entry.name ?? ""))
      .map(async (entry) => {
        const name = entry.name ?? "file";
        const entryPath = await join(vertex.asset_directory, name);
        return {
          name,
          path: entryPath,
        };
      })
  );
  return files;
};
