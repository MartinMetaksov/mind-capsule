import * as React from "react";
import { Box } from "@mui/material";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import type { Reference } from "@/core/common/reference";
import {
  VertexNode,
  VERTEX_NODE_HEIGHT,
  VERTEX_NODE_WIDTH,
} from "./VertexNode";

export type VertexItem = {
  vertex: Vertex;
  workspace: Workspace;
};

type VertexGridProps = {
  items: VertexItem[];

  selectedVertexId: string | null;
  onSelect: (vertexId: string) => void;
  onDeselect: () => void;

  onOpenReferences?: (vertex: Vertex, type: Reference["type"]) => void;
  onOpenChildren?: (vertex: Vertex) => void;
  onDeleteVertex?: (vertex: Vertex) => void;

  dimPredicate?: (vertexId: string) => boolean;

  /**
   * Optional: if you render this inside an absolutely-positioned canvas,
   * you can choose whether the grid itself scrolls vertically.
   * Most of the time you want this `true`.
   */
  scrollY?: boolean;

  showWorkspaceLabel?: boolean;
};

export const VertexGrid: React.FC<VertexGridProps> = ({
  items,
  selectedVertexId,
  onSelect,
  onDeselect,
  onOpenReferences,
  onOpenChildren,
  onDeleteVertex,
  dimPredicate,
  scrollY = true,
  showWorkspaceLabel = true,
}) => {
  const anySelected = selectedVertexId !== null;
  const outerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    if (!outerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(outerRef.current);
    return () => observer.disconnect();
  }, []);

  const gapPx = 24; // gap: 3 -> 24px with MUI spacing
  const slotWidth = VERTEX_NODE_WIDTH + gapPx;
  const maxColumns =
    containerWidth > 0
      ? Math.max(1, Math.floor((containerWidth + gapPx) / slotWidth))
      : 1;
  const leftAlign = items.length < maxColumns;

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
      }}
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onDeselect();
      }}
    >
      <Box
        sx={{
          display: "grid",
          gap: 3,
          width: "100%",
          maxWidth: "100%",
          mx: 0,

          /**
           * Responsive grid:
           * - Each card keeps its own fixed width (VertexNode width),
           * - Grid auto-fills columns and wraps to rows.
           */
          gridTemplateColumns: `repeat(auto-fit, minmax(${VERTEX_NODE_WIDTH}px, ${VERTEX_NODE_WIDTH}px))`,

          /**
           * Keep items left-aligned (prevents stretched weirdness when space is wide).
           * Each grid cell becomes at least VERTEX_NODE_WIDTH, but can grow.
           * We still want the node itself to stay fixed width, so we align items.
           */
          justifyContent: leftAlign ? "flex-start" : "center",
          justifyItems: leftAlign ? "start" : "center",
          alignItems: "start",
        }}
      >
        {items.map(({ vertex, workspace }) => (
          <Box
            key={vertex.id}
            sx={{
              width: VERTEX_NODE_WIDTH,

              height: VERTEX_NODE_HEIGHT + 10,
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <VertexNode
              vertex={vertex}
              workspace={workspace}
              selected={selectedVertexId === vertex.id}
              dimmed={
                dimPredicate
                  ? dimPredicate(vertex.id)
                  : anySelected && selectedVertexId !== vertex.id
              }
              onSelect={onSelect}
              onDeselect={onDeselect}
              onOpenReferences={onOpenReferences}
              onOpenChildren={onOpenChildren}
              showWorkspaceLabel={showWorkspaceLabel}
              onDelete={onDeleteVertex}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};
