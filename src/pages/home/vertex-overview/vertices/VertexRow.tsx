import * as React from "react";
import { Box, ButtonBase, Grow, Paper, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import { VertexNode } from "./VertexNode";
import { Reference } from "@/core/common/reference";

type VertexRowProps = {
  workspace: Workspace;
  vertices: Vertex[];
  onCreateVertex?: (workspace: Workspace) => void;
  onOpenReferences?: (vertex: Vertex, type: Reference["type"]) => void;
  onOpenChildren?: (vertex: Vertex) => void;
};

export const VertexRow: React.FC<VertexRowProps> = ({
  workspace,
  vertices,
  onCreateVertex,
  onOpenReferences,
  onOpenChildren,
}) => {
  const [selectedVertexId, setSelectedVertexId] = React.useState<string | null>(
    null
  );

  const anySelected = selectedVertexId !== null;

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ px: 2, mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {workspace.name}
        </Typography>
        {workspace.purpose && (
          <Typography variant="body2" color="text.secondary">
            {workspace.purpose}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          px: 2,
          pb: 10, // space for action bar
          overflowX: "auto",
          overflowY: "visible",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x proximity",
        }}
        onClick={(e) => {
          // Click on empty space deselects
          if (e.currentTarget === e.target) setSelectedVertexId(null);
        }}
      >
        {/* Empty state (Add new vertex) */}
        <Grow in timeout={240}>
          <Box sx={{ flex: "0 0 auto" }}>
            <ButtonBase
              onClick={() => onCreateVertex?.(workspace)}
              sx={{
                borderRadius: "15px",
              }}
            >
              <Paper
                variant="outlined"
                sx={(theme) => ({
                  width: "100%",
                  height: "100%",
                  borderRadius: "15 px",
                  borderStyle: "dashed",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  color: theme.palette.text.secondary,
                })}
              >
                <AddRoundedIcon />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  New vertex
                </Typography>
              </Paper>
            </ButtonBase>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block", textAlign: "center" }}
            >
              {workspace.name}
            </Typography>
          </Box>
        </Grow>

        {/* Actual vertices */}
        {vertices.map((v) => (
          <Box key={v.id} sx={{ scrollSnapAlign: "start" }}>
            <VertexNode
              vertex={v}
              workspace={workspace}
              selected={selectedVertexId === v.id}
              dimmed={anySelected && selectedVertexId !== v.id}
              onSelect={(id) => setSelectedVertexId(id)}
              onDeselect={() => setSelectedVertexId(null)}
              onOpenReferences={onOpenReferences}
              onOpenChildren={onOpenChildren}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};
