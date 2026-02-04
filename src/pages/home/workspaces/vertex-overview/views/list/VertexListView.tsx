import * as React from "react";
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";

import type { Vertex } from "@/core/vertex";
import type { VertexItem } from "../grid/VertexGrid";
import { VertexCounts } from "../../components/VertexCounts";

const REORDER_END_ID = "__end__";

type VertexListViewProps = {
  items: VertexItem[];
  onSelect: (vertexId: string) => void;
  onDeleteVertex?: (vertex: Vertex) => void;
  renderActions?: (item: VertexItem) => React.ReactNode;
  showWorkspaceLabel?: boolean;
  onReorder?: (sourceId: string, targetId: string) => void;
  dragLabel?: string;
};

export const VertexListView: React.FC<VertexListViewProps> = ({
  items,
  onSelect,
  onDeleteVertex,
  renderActions,
  showWorkspaceLabel = true,
  onReorder,
  dragLabel = "Reorder",
}) => {
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [rowHeight, setRowHeight] = React.useState(64);
  const [draggingRect, setDraggingRect] = React.useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [pointerY, setPointerY] = React.useState<number | null>(null);
  const pointerYRef = React.useRef<number | null>(null);
  const dropAfterEndRef = React.useRef(false);
  const [suppressTransitions, setSuppressTransitions] = React.useState(false);
  const [suppressHover, setSuppressHover] = React.useState(false);
  const draggingIdRef = React.useRef<string | null>(null);
  const overIdRef = React.useRef<string | null>(null);
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const dragStateRef = React.useRef<{
    id: string;
    startX: number;
    startY: number;
    active: boolean;
    listRect?: DOMRect;
    rows?: Array<{ id: string; top: number; bottom: number; mid: number }>;
  } | null>(null);

  const setOver = React.useCallback((id: string | null) => {
    overIdRef.current = id;
  }, []);

  React.useLayoutEffect(() => {
    if (!listRef.current) return;
    const row = listRef.current.querySelector(
      "[data-vertex-id]"
    ) as HTMLElement | null;
    if (!row) return;
    setRowHeight(row.offsetHeight);
  }, [items.length]);

  const dragRange = React.useMemo(() => {
    if (!draggingId || pointerY === null) return null;
    const snapshot = dragStateRef.current;
    const rows = snapshot?.rows ?? [];
    if (rows.length === 0) {
      dropAfterEndRef.current = false;
      return null;
    }
    const lastRow = rows[rows.length - 1];
    const fromIndex = items.findIndex((entry) => entry.vertex.id === draggingId);
    if (fromIndex < 0) return null;
    if (pointerY >= lastRow.bottom - 4) {
      dropAfterEndRef.current = true;
      return {
        fromIndex,
        toIndex: items.length - 1,
        targetId: REORDER_END_ID,
      };
    }
    dropAfterEndRef.current = false;
    let target = lastRow;
    for (const row of rows) {
      if (pointerY < row.mid) {
        target = row;
        break;
      }
    }
    const toIndex = items.findIndex((entry) => entry.vertex.id === target.id);
    if (toIndex < 0 || fromIndex === toIndex) return null;
    return { fromIndex, toIndex, targetId: target.id };
  }, [draggingId, items, pointerY]);

  React.useEffect(() => {
    if (!dragRange) {
      setOver(null);
      return;
    }
    if (dragRange.targetId === REORDER_END_ID) {
      setOver(null);
      return;
    }
    setOver(dragRange.targetId ?? null);
  }, [dragRange, items, setOver]);

  const shiftForId = React.useCallback(
    (id: string) => {
      if (!dragRange) return 0;
      const index = items.findIndex((entry) => entry.vertex.id === id);
      if (index < 0 || index === dragRange.fromIndex) return 0;
      const shift = rowHeight + 8;
      if (dragRange.fromIndex < dragRange.toIndex) {
        if (index > dragRange.fromIndex && index <= dragRange.toIndex) {
          return -shift;
        }
      } else if (dragRange.fromIndex > dragRange.toIndex) {
        if (index >= dragRange.toIndex && index < dragRange.fromIndex) {
          return shift;
        }
      }
      return 0;
    },
    [dragRange, items, rowHeight]
  );

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
      const listRect = dragStateRef.current?.listRect;
      const nextY = listRect
        ? Math.min(Math.max(event.clientY, listRect.top - 24), listRect.bottom + 24)
        : event.clientY;
      pointerYRef.current = nextY;
      setPointerY(nextY);
    };
    const handleUp = () => {
    const state = dragStateRef.current;
      const targetId = overIdRef.current;
      if (state?.active && onReorder) {
        const dropId = dropAfterEndRef.current
          ? REORDER_END_ID
          : targetId ?? null;
        if (!dropId) return;
        onReorder(state.id, dropId);
        setSuppressTransitions(true);
        setSuppressHover(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setSuppressTransitions(false);
            setSuppressHover(false);
          });
        });
      }
      setDraggingId(null);
      setOver(null);
      setDragOffset({ x: 0, y: 0 });
      setDraggingRect(null);
      setPointerY(null);
      pointerYRef.current = null;
      dropAfterEndRef.current = false;
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

  return (
    <List
      dense
      sx={{
        width: "100%",
        position: "relative",
        pointerEvents: suppressHover ? "none" : "auto",
      }}
      data-testid="vertex-overview-list"
      ref={listRef}
    >
      {items.map((item) => {
        const thumbnail = item.vertex.thumbnail_path;
        const isDragging = draggingId === item.vertex.id;
        return (
          <ListItem key={item.vertex.id} disableGutters>
            <ListItemButton
              onClick={() => onSelect(item.vertex.id)}
              data-vertex-id={item.vertex.id}
              sx={{
                gap: 2,
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: 2,
                pointerEvents: isDragging ? "none" : "auto",
                opacity: isDragging ? 0 : 1,
                transition:
                  draggingId === item.vertex.id || suppressTransitions
                    ? "none"
                    : "transform 150ms ease, box-shadow 150ms ease, outline-color 150ms ease",
                boxShadow:
                  draggingId === item.vertex.id
                    ? "0 10px 20px rgba(0,0,0,0.25)"
                    : "none",
                transform:
                  draggingId === item.vertex.id
                    ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(0.99)`
                    : `translateY(${shiftForId(item.vertex.id)}px)`,
                willChange: "transform",
                backfaceVisibility: "hidden",
                zIndex: draggingId === item.vertex.id ? 3 : 1,
                ...(draggingId || suppressTransitions
                  ? {
                      "&:hover": { backgroundColor: "transparent" },
                      "&.Mui-focusVisible": { backgroundColor: "transparent" },
                    }
                  : null),
              }}
            >
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flex: 1 }}>
                {onReorder && (
                  <IconButton
                    size="small"
                    draggable={false}
                    aria-label={dragLabel}
                    onPointerDown={(event) => {
                      if (!onReorder) return;
                      if (event.button !== 0) return;
                      event.stopPropagation();
                      const listRect = listRef.current?.getBoundingClientRect();
                      const rows = Array.from(
                        listRef.current?.querySelectorAll<HTMLElement>("[data-vertex-id]") ??
                          []
                      )
                        .map((row) => {
                          const rect = row.getBoundingClientRect();
                          return {
                            id: row.dataset.vertexId ?? "",
                            top: rect.top,
                            bottom: rect.bottom,
                            mid: rect.top + rect.height / 2,
                          };
                        })
                        .filter((row) => row.id && row.id !== item.vertex.id)
                        .sort((a, b) => a.top - b.top);
                      const rowEl = (
                        event.currentTarget.closest(
                          "[data-vertex-id]"
                        ) as HTMLElement | null
                      )?.getBoundingClientRect();
                      if (rowEl) {
                        setDraggingRect({
                          top: rowEl.top,
                          left: rowEl.left,
                          width: rowEl.width,
                          height: rowEl.height,
                        });
                      }
                      dragStateRef.current = {
                        id: item.vertex.id,
                        startX: event.clientX,
                        startY: event.clientY,
                        active: false,
                        listRect: listRect ?? undefined,
                        rows,
                      };
                      setDraggingId(item.vertex.id);
                      draggingIdRef.current = item.vertex.id;
                      setOver(null);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    sx={{
                      cursor: "grab",
                      flexShrink: 0,
                      bgcolor: "background.paper",
                      "&:hover": { bgcolor: "background.default" },
                    }}
                  >
                    <DragIndicatorRoundedIcon fontSize="small" />
                  </IconButton>
                )}
                {thumbnail ? (
                  <Box
                    component="img"
                    src={thumbnail}
                    alt={item.vertex.thumbnail_alt ?? item.vertex.title}
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 1,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <Box
                    sx={(theme) => ({
                      width: 56,
                      height: 56,
                      borderRadius: 1,
                      flexShrink: 0,
                      background:
                        theme.palette.mode === "dark"
                          ? "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))"
                          : "linear-gradient(145deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02))",
                    })}
                  />
                )}
                <ListItemText
                  primary={item.vertex.title}
                  secondary={
                    showWorkspaceLabel ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                      >
                        {item.workspace.name}
                      </Typography>
                    ) : null
                  }
                  primaryTypographyProps={{ noWrap: true }}
                />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <VertexCounts counts={item.counts} variant="list" />
                {renderActions ? (
                  <Box onClick={(e) => e.stopPropagation()}>
                    {renderActions(item)}
                  </Box>
                ) : onDeleteVertex ? (
                  <IconButton
                    aria-label="delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteVertex(item.vertex);
                    }}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </Box>
            </ListItemButton>
          </ListItem>
        );
      })}
      {draggingId && draggingRect && (
        <Box
          sx={{
            position: "fixed",
            top: draggingRect.top + dragOffset.y,
            left: draggingRect.left + dragOffset.x,
            width: draggingRect.width,
            height: draggingRect.height,
            pointerEvents: "none",
            zIndex: 10,
            transform: "scale(0.99)",
          }}
        >
          <Box
            sx={{
              borderRadius: 2,
              boxShadow: "0 10px 20px rgba(0,0,0,0.25)",
              bgcolor: "background.paper",
              height: "100%",
              display: "flex",
              alignItems: "center",
              gap: 2,
              px: 2,
            }}
          >
            <DragIndicatorRoundedIcon fontSize="small" />
            <Typography noWrap>
              {items.find((entry) => entry.vertex.id === draggingId)?.vertex.title ??
                ""}
            </Typography>
          </Box>
        </Box>
      )}
    </List>
  );
};
