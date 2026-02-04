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
import { ReorderableGrid } from "../../common/ReorderableGrid";

export type VertexItemCounts = {
  items: number;
  notes: number;
  images: number;
  urls: number;
  files: number;
};

export type VertexItem = {
  vertex: Vertex;
  workspace: Workspace;
  counts?: VertexItemCounts;
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
  return (
    <ReorderableGrid
      items={items}
      getId={(item) => item.vertex.id}
      itemWidth={VERTEX_NODE_WIDTH}
      itemHeight={VERTEX_NODE_HEIGHT + 10}
      gap={24}
      scrollY={scrollY}
      onReorder={onReorder}
      dragLabel={dragLabel}
      renderItem={(item, state) => (
        <>
          {onReorder && (
            <Box sx={{ position: "absolute", top: 6, left: 6, zIndex: 2 }}>
              <IconButton
                size="small"
                draggable={false}
                aria-label={dragLabel}
                onPointerDown={state.dragHandleProps?.onPointerDown}
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
            vertex={item.vertex}
            workspace={item.workspace}
            selected={selectedVertexId === item.vertex.id}
            onSelect={onSelect}
            showWorkspaceLabel={showWorkspaceLabel}
            onDelete={onDeleteVertex}
            counts={item.counts}
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
              {renderOverlay(item)}
            </Box>
          )}
        </>
      )}
    />
  );
};
