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

import type { Vertex } from "@/core/vertex";
import type { VertexItem } from "../../../vertices/vertex-grid/VertexGrid";

type VertexListViewProps = {
  items: VertexItem[];
  onSelect: (vertexId: string) => void;
  onDeleteVertex?: (vertex: Vertex) => void;
  renderActions?: (item: VertexItem) => React.ReactNode;
  showWorkspaceLabel?: boolean;
};

export const VertexListView: React.FC<VertexListViewProps> = ({
  items,
  onSelect,
  onDeleteVertex,
  renderActions,
  showWorkspaceLabel = true,
}) => (
  <List dense sx={{ width: "100%" }} data-testid="vertex-overview-list">
    {items.map((item) => {
      const thumbnail = item.vertex.thumbnail_path;
      return (
        <ListItem
          key={item.vertex.id}
          disableGutters
          secondaryAction={
            renderActions
              ? renderActions(item)
              : onDeleteVertex
                ? (
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => onDeleteVertex(item.vertex)}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  )
                : null
          }
        >
          <ListItemButton
            onClick={() => onSelect(item.vertex.id)}
            sx={{ gap: 2, alignItems: "center" }}
          >
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
          </ListItemButton>
        </ListItem>
      );
    })}
  </List>
);
