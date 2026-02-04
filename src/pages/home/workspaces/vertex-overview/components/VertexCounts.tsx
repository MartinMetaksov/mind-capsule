import * as React from "react";
import { Box, Typography } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import type { VertexItemCounts } from "../views/grid/VertexGrid";

type VertexCountsProps = {
  counts?: VertexItemCounts;
  variant?: "grid" | "list";
};

const COUNT_ITEMS = [
  { key: "items" as const, icon: <AccountTreeOutlinedIcon fontSize="inherit" /> },
  { key: "notes" as const, icon: <CommentOutlinedIcon fontSize="inherit" /> },
  { key: "images" as const, icon: <ImageOutlinedIcon fontSize="inherit" /> },
  { key: "urls" as const, icon: <LinkOutlinedIcon fontSize="inherit" /> },
  { key: "files" as const, icon: <InsertDriveFileOutlinedIcon fontSize="inherit" /> },
];

export const VertexCounts: React.FC<VertexCountsProps> = ({
  counts,
  variant = "grid",
}) => {
  if (!counts) return null;
  const visibleItems = COUNT_ITEMS.filter((item) => counts[item.key] > 0);
  const isGrid = variant === "grid";
  if (visibleItems.length === 0) {
    return isGrid ? <Box sx={{ minHeight: 16 }} /> : null;
  }
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: isGrid ? 1.2 : 1.6,
        color: isGrid ? "common.white" : "text.secondary",
      }}
    >
      {visibleItems.map((item) => (
        <Box
          key={item.key}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            fontSize: isGrid ? 12 : 14,
            opacity: isGrid ? 0.9 : 0.8,
          }}
        >
          <Box sx={{ display: "inline-flex", alignItems: "center" }}>
            {item.icon}
          </Box>
          <Typography
            component="span"
            variant="caption"
            sx={{ fontWeight: 600 }}
          >
            {counts[item.key]}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};
