import * as React from "react";
import { Box } from "@mui/material";

import type { Vertex } from "@/core/vertex";
import type {
  ImageEntry,
  NoteEntry,
} from "@/integrations/fileSystem/fileSystem";
import type { GraphNode } from "../views/graph/types";
import type { VertexItem } from "../views/grid/VertexGrid";
import { GraphReferenceModal } from "../views/graph/components/GraphReferenceModal";

type GraphReferenceOverlayProps = {
  open: boolean;
  closing: boolean;
  items: VertexItem[];
  onClose: () => void;
  onSelectVertex: (node: GraphNode) => void;
  onSelectNote: (note: NoteEntry, noteVertex: Vertex) => void;
  onSelectImage: (image: ImageEntry, imageVertex: Vertex) => void;
  onSelectFile: (file: { name: string }, fileVertex: Vertex) => void;
};

export const GraphReferenceOverlay: React.FC<GraphReferenceOverlayProps> = ({
  open,
  closing,
  items,
  onClose,
  onSelectVertex,
  onSelectNote,
  onSelectImage,
  onSelectFile,
}) => {
  const isVisible = open || closing;

  if (!isVisible) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: -20,
        zIndex: 6,
        opacity: open ? 1 : 0,
        transition: "opacity 180ms ease",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
        <GraphReferenceModal
          open={isVisible}
          items={items}
          onClose={onClose}
          onSelectVertex={onSelectVertex}
          onSelectNote={onSelectNote}
          onSelectImage={onSelectImage}
          onSelectFile={onSelectFile}
        />
      </Box>
    </Box>
  );
};
