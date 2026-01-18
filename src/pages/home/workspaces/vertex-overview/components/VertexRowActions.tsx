import * as React from "react";
import { Box, IconButton } from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";

type VertexRowActionsProps = {
  onOpenFolder: () => void;
  onDelete: () => void;
  openLabel: string;
  deleteLabel: string;
  disableOpen?: boolean;
};

export const VertexRowActions: React.FC<VertexRowActionsProps> = ({
  onOpenFolder,
  onDelete,
  openLabel,
  deleteLabel,
  disableOpen = false,
}) => (
  <Box sx={{ display: "flex", gap: 1 }}>
    <IconButton
      size="small"
      sx={{ bgcolor: "background.paper" }}
      aria-label={openLabel}
      disabled={disableOpen}
      onClick={(e) => {
        e.stopPropagation();
        if (!disableOpen) onOpenFolder();
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
