import * as React from "react";
import { Box, IconButton } from "@mui/material";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import {
  VertexNode,
  VERTEX_NODE_HEIGHT,
  VERTEX_NODE_WIDTH,
} from "../../vertices/vertex-node/VertexNode";

export type VertexItem = {
  vertex: Vertex;
  workspace: Workspace;
};

type VertexGridProps = {
  items: VertexItem[];
  selectedVertexId: string | null;
  onSelect: (vertexId: string) => void;
  onDeleteVertex?: (vertex: Vertex) => void;
  renderOverlay?: (item: VertexItem) => React.ReactNode;
  scrollY?: boolean;
  showWorkspaceLabel?: boolean;
  onReorder?: (sourceId: string, targetId: string) => void;
  dragLabel?: string;
};

export const VertexGrid: React.FC<VertexGridProps> = ({
  items,
  selectedVertexId,
  onSelect,
  onDeleteVertex,
  renderOverlay,
  scrollY = true,
  showWorkspaceLabel = true,
  onReorder,
  dragLabel = "Reorder",
}) => {
  const outerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [suppressHover, setSuppressHover] = React.useState(false);
  const [suppressTransitions, setSuppressTransitions] = React.useState(false);
  const draggingIdRef = React.useRef<string | null>(null);
  const overIdRef = React.useRef<string | null>(null);
  const dragStateRef = React.useRef<{
    id: string;
    startX: number;
    startY: number;
    active: boolean;
    rects?: Array<{ id: string; left: number; right: number; top: number; bottom: number }>;
  } | null>(null);

  const setOver = React.useCallback((id: string | null) => {
    overIdRef.current = id;
    setOverId(id);
  }, []);

  const dragRange = React.useMemo(() => {
    if (!draggingId || !overId) return null;
    const fromIndex = items.findIndex((item) => item.vertex.id === draggingId);
    const toIndex = items.findIndex((item) => item.vertex.id === overId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return null;
    return { fromIndex, toIndex };
  }, [draggingId, items, overId]);


  React.useLayoutEffect(() => {
    if (!outerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(outerRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!draggingId) return;
    const handleMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      const dx = Math.abs(event.clientX - state.startX);
      const dy = Math.abs(event.clientY - state.startY);
      if (!state.active && dx + dy < 4) return;
      if (!state.active) state.active = true;
      setDragOffset({
        x: event.clientX - state.startX,
        y: event.clientY - state.startY,
      });
      const rects = state.rects ?? [];
      let nearestId: string | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const rect of rects) {
        if (rect.id === state.id) continue;
        const centerX = (rect.left + rect.right) / 2;
        const centerY = (rect.top + rect.bottom) / 2;
        const dist = Math.hypot(event.clientX - centerX, event.clientY - centerY);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestId = rect.id;
        }
      }
      setOver(nearestId);
    };
    const handleUp = () => {
      const state = dragStateRef.current;
      const targetId = overIdRef.current;
      if (state?.active && targetId && onReorder) {
        onReorder(state.id, targetId);
        setSuppressHover(true);
        setSuppressTransitions(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setSuppressHover(false);
            setSuppressTransitions(false);
          });
        });
      }
      setDraggingId(null);
      setOver(null);
      setDragOffset({ x: 0, y: 0 });
      dragStateRef.current = null;
      draggingIdRef.current = null;
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [draggingId, onReorder, setOver]);

  const gapPx = 24;
  const slotWidth = VERTEX_NODE_WIDTH + gapPx;
  const slotHeight = VERTEX_NODE_HEIGHT + 10 + gapPx;
  const maxColumns =
    containerWidth > 0
      ? Math.max(1, Math.floor((containerWidth + gapPx) / slotWidth))
      : 1;
  const leftAlign = items.length < maxColumns;

  const moveItem = React.useCallback(
    (list: VertexItem[], sourceId: string, targetId: string) => {
      const fromIndex = list.findIndex((item) => item.vertex.id === sourceId);
      const toIndex = list.findIndex((item) => item.vertex.id === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list;
      const next = [...list];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    },
    []
  );

  const reorderedItems = React.useMemo(() => {
    if (!dragRange || !draggingId || !overId) return items;
    return moveItem(items, draggingId, overId);
  }, [dragRange, draggingId, items, moveItem, overId]);

  const getPosition = React.useCallback(
    (index: number) => ({
      x: (index % maxColumns) * slotWidth,
      y: Math.floor(index / maxColumns) * slotHeight,
    }),
    [maxColumns, slotHeight, slotWidth]
  );

  const getDeltaForId = React.useCallback(
    (id: string) => {
      if (!dragRange || !draggingId || !overId) return { x: 0, y: 0 };
      if (id === draggingId) return { x: 0, y: 0 };
      const currentIndex = items.findIndex((item) => item.vertex.id === id);
      const targetIndex = reorderedItems.findIndex((item) => item.vertex.id === id);
      if (currentIndex < 0 || targetIndex < 0) return { x: 0, y: 0 };
      const current = getPosition(currentIndex);
      const target = getPosition(targetIndex);
      return { x: target.x - current.x, y: target.y - current.y };
    },
    [dragRange, draggingId, getPosition, items, overId, reorderedItems]
  );

  return (
    <Box
      ref={outerRef}
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        overflowY: scrollY ? "auto" : "visible",
        overflowX: "hidden",
        py: 2,
        pointerEvents: suppressHover ? "none" : "auto",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gap: 3,
          width: "100%",
          maxWidth: "100%",
          mx: 0,
          gridTemplateColumns: `repeat(auto-fit, minmax(${VERTEX_NODE_WIDTH}px, ${VERTEX_NODE_WIDTH}px))`,
          justifyContent: leftAlign ? "flex-start" : "center",
          justifyItems: leftAlign ? "start" : "center",
          alignItems: "start",
        }}
      >
        {items.map(({ vertex, workspace }) => (
          <Box
            key={vertex.id}
            data-vertex-id={vertex.id}
            sx={{
              width: VERTEX_NODE_WIDTH,
              height: VERTEX_NODE_HEIGHT + 10,
              position: "relative",
              pointerEvents: draggingId === vertex.id ? "none" : "auto",
              borderRadius: 2,
              transition:
                draggingId === vertex.id || suppressTransitions
                  ? "none"
                  : "transform 150ms ease, box-shadow 150ms ease, outline-color 150ms ease",
              boxShadow:
                draggingId === vertex.id
                  ? "0 12px 24px rgba(0,0,0,0.35)"
                  : "none",
              transform:
                draggingId === vertex.id
                  ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(0.98)`
                  : `translate3d(${getDeltaForId(vertex.id).x}px, ${getDeltaForId(vertex.id).y}px, 0)`,
              willChange: "transform",
              backfaceVisibility: "hidden",
              zIndex: draggingId === vertex.id ? 3 : 1,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {onReorder && (
              <Box sx={{ position: "absolute", top: 6, left: 6, zIndex: 2 }}>
                <IconButton
                  size="small"
                  draggable={false}
                  aria-label={dragLabel}
                  onPointerDown={(event) => {
                    if (!onReorder) return;
                    if (event.button !== 0) return;
                    event.stopPropagation();
                    const rects = Array.from(
                      outerRef.current?.querySelectorAll<HTMLElement>(
                        "[data-vertex-id]"
                      ) ?? []
                    )
                      .map((el) => {
                        const rect = el.getBoundingClientRect();
                        return {
                          id: el.dataset.vertexId ?? "",
                          left: rect.left,
                          right: rect.right,
                          top: rect.top,
                          bottom: rect.bottom,
                        };
                      })
                      .filter((entry) => entry.id);
                    dragStateRef.current = {
                      id: vertex.id,
                      startX: event.clientX,
                      startY: event.clientY,
                      active: false,
                      rects,
                    };
                    setDraggingId(vertex.id);
                    draggingIdRef.current = vertex.id;
                    setOver(null);
                  }}
                  sx={{
                    cursor: "grab",
                    bgcolor: "background.paper",
                    boxShadow: 2,
                    "&:hover": {
                      bgcolor: "background.default",
                    },
                  }}
                >
                  <DragIndicatorRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            <VertexNode
              vertex={vertex}
              workspace={workspace}
              selected={selectedVertexId === vertex.id}
              onSelect={onSelect}
              showWorkspaceLabel={showWorkspaceLabel}
              onDelete={onDeleteVertex}
            />
            {renderOverlay && (
              <Box
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 2,
                }}
              >
                {renderOverlay({ vertex, workspace })}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
