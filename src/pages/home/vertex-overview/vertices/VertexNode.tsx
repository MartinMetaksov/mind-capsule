import * as React from "react";
import {
  Badge,
  Box,
  Grow,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import { Reference } from "@/core/common/reference";

export type VertexNodeProps = {
  vertex: Vertex;
  workspace: Workspace;
  selected: boolean;
  dimmed: boolean;
  onSelect: (vertexId: string) => void;
  onDeselect: () => void;

  onOpenReferences?: (vertex: Vertex, type: Reference["type"]) => void;
  onOpenChildren?: (vertex: Vertex) => void;
};

type RefCounts = Record<Reference["type"], number>;

function countReferences(vertex: Vertex): RefCounts {
  const counts: RefCounts = {
    vertex: 0,
    url: 0,
    image: 0,
    file: 0,
    comment: 0,
  };

  const groups = vertex.reference_groups ?? [];
  for (const g of groups) {
    for (const r of g.references) {
      counts[r.type] += 1;
    }
  }

  return counts;
}

/** Fixed size for all vertices */
export const VERTEX_NODE_WIDTH = 200;
export const VERTEX_NODE_HEIGHT = 140;
export const VERTEX_RADIUS = 1;

export const VertexNode: React.FC<VertexNodeProps> = ({
  vertex,
  workspace,
  selected,
  dimmed,
  onSelect,
  onDeselect,
  onOpenReferences,
  onOpenChildren,
}) => {
  const refs = React.useMemo(() => countReferences(vertex), [vertex]);

  const hasAnyRefs =
    refs.vertex + refs.url + refs.image + refs.file + refs.comment > 0;

  const hasChildren = (vertex.children_ids?.length ?? 0) > 0;

  const handleClick = () => {
    if (selected) onDeselect();
    else onSelect(vertex.id);
  };

  return (
    <Grow in timeout={220}>
      <Box
        sx={{
          width: VERTEX_NODE_WIDTH,
          flex: "0 0 auto",
          opacity: dimmed ? 0.28 : 1,
          filter: dimmed ? "grayscale(0.3)" : "none",
          transition:
            "opacity 160ms ease, filter 160ms ease, transform 160ms ease",
          transform: selected ? "scale(1.03)" : "scale(1)",
          position: "relative",
          pointerEvents: dimmed ? "none" : "auto",
        }}
      >
        {/* Node */}
        <Paper
          onClick={handleClick}
          role="button"
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
            "&:hover": {
              borderColor: theme.palette.primary.main,
            },
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

          {/* Overlay for text readability */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.70), rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.05))",
            }}
          />

          {/* Title */}
          <Box
            sx={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 12,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                color: "common.white",
                fontWeight: 800,
                lineHeight: 1.2,
                textShadow: "0 1px 8px rgba(0,0,0,0.35)",
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

        {/* Workspace label */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            mt: 0.75,
            display: "block",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={workspace.name}
        >
          {workspace.name}
        </Typography>

        {/* Action bar */}
        {selected && (
          <Paper
            elevation={6}
            sx={(theme) => ({
              position: "absolute",
              left: "50%",
              bottom: -48,
              transform: "translateX(-50%)",
              px: 1,
              py: 0.5,
              borderRadius: 1,
              display: "flex",
              gap: 0.5,
              alignItems: "center",
              border: `1px solid ${theme.palette.divider}`,
              backdropFilter: "blur(8px)",
            })}
          >
            <Tooltip title="Vertex references" disableInteractive>
              <span>
                <IconButton
                  size="small"
                  disabled={!refs.vertex}
                  onClick={() => onOpenReferences?.(vertex, "vertex")}
                >
                  <Badge badgeContent={refs.vertex} color="primary" max={99}>
                    <HubOutlinedIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Links" disableInteractive>
              <span>
                <IconButton
                  size="small"
                  disabled={!refs.url}
                  onClick={() => onOpenReferences?.(vertex, "url")}
                >
                  <Badge badgeContent={refs.url} color="primary" max={99}>
                    <LinkOutlinedIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Images" disableInteractive>
              <span>
                <IconButton
                  size="small"
                  disabled={!refs.image}
                  onClick={() => onOpenReferences?.(vertex, "image")}
                >
                  <Badge badgeContent={refs.image} color="primary" max={99}>
                    <ImageOutlinedIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Files" disableInteractive>
              <span>
                <IconButton
                  size="small"
                  disabled={!refs.file}
                  onClick={() => onOpenReferences?.(vertex, "file")}
                >
                  <Badge badgeContent={refs.file} color="primary" max={99}>
                    <InsertDriveFileOutlinedIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Comments" disableInteractive>
              <span>
                <IconButton
                  size="small"
                  disabled={!refs.comment}
                  onClick={() => onOpenReferences?.(vertex, "comment")}
                >
                  <Badge badgeContent={refs.comment} color="primary" max={99}>
                    <CommentOutlinedIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Open children" disableInteractive>
              <span>
                <IconButton
                  size="small"
                  disabled={!hasChildren}
                  onClick={() => onOpenChildren?.(vertex)}
                >
                  <Badge
                    badgeContent={vertex.children_ids?.length ?? 0}
                    color="secondary"
                    max={99}
                  >
                    <AccountTreeOutlinedIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </span>
            </Tooltip>
          </Paper>
        )}

        {selected && !hasAnyRefs && !hasChildren && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              position: "absolute",
              left: "50%",
              bottom: -70,
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
            }}
          >
            No actions yet
          </Typography>
        )}
      </Box>
    </Grow>
  );
};
