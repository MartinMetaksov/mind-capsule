import * as React from "react";
import { Box, IconButton } from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";

type DetachedOverlayActionsProps = {
  onOpenFolder: () => void;
  onDelete: () => void;
  openLabel: string;
  deleteLabel: string;
};

export const DetachedOverlayActions: React.FC<DetachedOverlayActionsProps> = ({
  onOpenFolder,
  onDelete,
  openLabel,
  deleteLabel,
}) => (
  <Box sx={{ display: "flex", gap: 1 }}>
    <IconButton
      size="small"
      sx={{ bgcolor: "background.paper" }}
      aria-label={openLabel}
      onClick={(e) => {
        e.stopPropagation();
        onOpenFolder();
      }}
    >
      <FolderOpenOutlinedIcon fontSize="small" />
    </IconButton>
    <IconButton
      size="small"
      sx={{ bgcolor: "background.paper" }}
      aria-label={deleteLabel}
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
    >
      <DeleteOutlineRoundedIcon fontSize="small" />
    </IconButton>
  </Box>
);
