import * as React from "react";
import * as d3 from "d3";
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import type { Vertex } from "@/core/vertex";
import type { VertexItem } from "../../grid/VertexGrid";
import type { GraphNode } from "../types";
import { GraphCanvas } from "./GraphCanvas";
import { GraphActionRing, type GraphAction } from "./GraphActionRing";
import { GraphRecenterButton } from "./GraphRecenterButton";
import { ACTION_RADIUS } from "../constants";
import { useGraphData } from "../hooks/useGraphData";

type GraphActionModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  items: VertexItem[];
  currentVertex?: Vertex | null;
  onClose: () => void;
  getActions: (selectedNode: GraphNode | null) => GraphAction[];
};

export const GraphActionModal: React.FC<GraphActionModalProps> = ({
  open,
  title,
  subtitle,
  items,
  currentVertex,
  onClose,
  getActions,
}) => {
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
  const { t } = useTranslation("common");
  const theme = useTheme();

  const currentVertexId = currentVertex?.id ?? null;
  const { graphData, loading, error } = useGraphData(items);

  React.useEffect(() => {
    if (!graphData) return;
    nodesByIdRef.current = new Map(
      graphData.nodes.map((node) => [node.id, node])
    );
  }, [graphData]);

  const selectedNode = selectedId
    ? nodesByIdRef.current.get(selectedId) ?? null
    : null;

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { bgcolor: "background.default" } }}
    >
      <DialogContent
        sx={{ p: 0, height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 3, py: 2 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography color="text.secondary">{subtitle}</Typography>
            )}
          </Box>
          <IconButton aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box sx={{ position: "relative", flex: 1, minHeight: 0 }}>
          {loading && (
            <Typography color="text.secondary" sx={{ px: 3, pt: 1 }}>
              {t("graphView.loading")}
            </Typography>
          )}
          {error && (
            <Typography color="error" sx={{ px: 3, pt: 1 }}>
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
              currentVertexId={currentVertexId}
              selectedId={selectedId}
              hoveredId={hoveredId}
              containerRef={containerRef}
              svgRef={svgRef}
              actionRef={actionRef}
              nodesByIdRef={nodesByIdRef}
              zoomTransformRef={zoomTransformRef}
              zoomBehaviorRef={zoomBehaviorRef}
              persistTransformKey="vertexOverview.graphModalTransform"
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
              actions={getActions(selectedNode)}
            />

            <GraphRecenterButton visible={isPanned} onClick={handleRecenter} />
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
