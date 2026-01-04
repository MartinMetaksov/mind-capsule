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

  dimPredicate?: (vertexId: string) => boolean;

  /**
   * Optional: if you render this inside an absolutely-positioned canvas,
   * you can choose whether the grid itself scrolls vertically.
   * Most of the time you want this `true`.
   */
  scrollY?: boolean;
};

export const VertexGrid: React.FC<VertexGridProps> = ({
  items,
  selectedVertexId,
  onSelect,
  onDeselect,
  onOpenReferences,
  onOpenChildren,
  dimPredicate,
  scrollY = true,
}) => {
  const anySelected = selectedVertexId !== null;

  return (
    <Box
      sx={{
        // Fill available space (important when inside a "canvas" wrapper)
        width: "100%",
        height: "100%",
        minHeight: 0,
        minWidth: 0,

        // Optional vertical scrolling
        overflowY: scrollY ? "auto" : "visible",
        overflowX: "hidden",

        // padding around the grid
        px: 2,
        py: 2,

        // provide some breathing room for VertexNode action bar if it overflows
        pb: 10,
      }}
      onMouseDown={(e) => {
        // Clicking empty space deselects
        if (e.currentTarget === e.target) onDeselect();
      }}
    >
      <Box
        sx={{
          display: "grid",
          gap: 1.25,

          /**
           * Responsive grid:
           * - Each card keeps its own fixed width (VertexNode width),
           * - Grid auto-fills columns and wraps to rows.
           */
          gridTemplateColumns: `repeat(auto-fill, minmax(${VERTEX_NODE_WIDTH}px, 1fr))`,

          /**
           * Keep items left-aligned (prevents stretched weirdness when space is wide).
           * Each grid cell becomes at least VERTEX_NODE_WIDTH, but can grow.
           * We still want the node itself to stay fixed width, so we align items.
           */
          justifyItems: "start",
          alignItems: "start",
        }}
      >
        {items.map(({ vertex, workspace }) => (
          <Box
            key={vertex.id}
            sx={{
              // Ensure each node occupies its fixed footprint
              width: VERTEX_NODE_WIDTH,

              // Reserve a bit more height so the action bar (absolute) doesn’t overlap next row
              // You can tune this if you change the action bar position.
              height: VERTEX_NODE_HEIGHT + 10,
              // Make sure clicks on the node don't trigger the grid "empty area" handler
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
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};
