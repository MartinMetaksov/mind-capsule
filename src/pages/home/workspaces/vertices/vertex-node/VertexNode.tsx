import * as React from "react";
import { Box, Grow, IconButton, Paper, Typography } from "@mui/material";
import { DeleteOutlineRounded } from "@mui/icons-material";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";

export type VertexNodeProps = {
  vertex: Vertex;
  workspace: Workspace;
  selected: boolean;
  onSelect: (vertexId: string) => void;
  showWorkspaceLabel?: boolean;
  onDelete?: (vertex: Vertex) => void;
};

export const VERTEX_NODE_WIDTH = 300;
export const VERTEX_NODE_HEIGHT = 210;
export const VERTEX_RADIUS = 1;

export const VertexNode: React.FC<VertexNodeProps> = ({
  vertex,
  workspace,
  selected,
  onSelect,
  showWorkspaceLabel = true,
  onDelete,
}) => {
  const handleClick = () => {
    onSelect(vertex.id);
  };

  return (
    <Grow in timeout={220}>
      <Box
        sx={{
          width: VERTEX_NODE_WIDTH,
          flex: "0 0 auto",
          transition:
            "opacity 160ms ease, filter 160ms ease, transform 160ms ease",
          transform: selected ? "scale(1.02)" : "scale(1)",
          position: "relative",
          pointerEvents: "auto",
        }}
      >
        <Paper
          onClick={handleClick}
          role="button"
          aria-label={vertex.title}
          tabIndex={0}
          elevation={selected ? 6 : 1}
          sx={(theme) => ({
            width: VERTEX_NODE_WIDTH,
            height: VERTEX_NODE_HEIGHT,
            borderRadius: VERTEX_RADIUS,
            overflow: "hidden",
            cursor: "pointer",
            userSelect: "none",
            position: "relative",
            outline: "none",
            border: selected
              ? `1px solid ${theme.palette.primary.main}`
              : `1px solid ${theme.palette.divider}`,
            "&:hover": { borderColor: theme.palette.primary.main },
          })}
        >
          {/* Thumbnail */}
          {vertex.thumbnail_path ? (
            <Box
              component="img"
              src={vertex.thumbnail_path}
              alt={vertex.thumbnail_alt ?? vertex.title}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <Box
              sx={(theme) => ({
                width: "100%",
                height: "100%",
                background:
                  theme.palette.mode === "dark"
                    ? "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))"
                    : "linear-gradient(145deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02))",
              })}
            />
          )}

          {/* Overlay */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.74), rgba(0,0,0,0.22) 55%, rgba(0,0,0,0.08))",
            }}
          />

          {onDelete && (
            <IconButton
              size="small"
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                bgcolor: "background.paper",
              }}
              aria-label="delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(vertex);
              }}
            >
              <DeleteOutlineRounded fontSize="small" />
            </IconButton>
          )}

          {/* Title */}
          <Box
            sx={{
              position: "absolute",
              left: 14,
              right: 14,
              bottom: 14,
              display: "flex",
              flexDirection: "column",
              gap: 0.25,
            }}
          >
            {showWorkspaceLabel && (
              <Typography
                variant="caption"
                sx={{
                  color: "common.white",
                  opacity: 0.9,
                  fontWeight: 700,
                  textShadow: "0 1px 8px rgba(0,0,0,0.35)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={workspace.name}
              >
                {workspace.name}
              </Typography>
            )}
            <Typography
              variant="h6"
              sx={{
                color: "common.white",
                fontWeight: 900,
                lineHeight: 1.15,
                textShadow: "0 1px 10px rgba(0,0,0,0.42)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {vertex.title}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Grow>
  );
};
