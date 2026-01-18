import * as React from "react";
import { Box } from "@mui/material";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import {
  VertexNode,
  VERTEX_NODE_HEIGHT,
  VERTEX_NODE_WIDTH,
} from "../vertex-node/VertexNode";

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
};

export const VertexGrid: React.FC<VertexGridProps> = ({
  items,
  selectedVertexId,
  onSelect,
  onDeleteVertex,
  renderOverlay,
  scrollY = true,
  showWorkspaceLabel = true,
}) => {
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

  const gapPx = 24;
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
            sx={{
              width: VERTEX_NODE_WIDTH,

              height: VERTEX_NODE_HEIGHT + 10,
              position: "relative",
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
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
