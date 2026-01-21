import * as React from "react";
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import { renderMarkdown } from "../utils/markdown";

type NotePreviewDialogProps = {
  open: boolean;
  title: string;
  text: string;
  onClose: () => void;
};

export const NotePreviewDialog: React.FC<NotePreviewDialogProps> = ({
  open,
  title,
  text,
  onClose,
}) => {
  const { t } = useTranslation("common");

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={onClose} aria-label={t("notesTab.close")}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 2,
          bgcolor: "background.default",
          color: "text.primary",
          "& h1,h2,h3,h4,h5,h6": { margin: "0.5em 0 0.25em" },
          "& p": { margin: "0.25em 0" },
          "& .broken-link-indicator": {
            color: "error.main",
            fontWeight: 600,
            fontSize: "0.85em",
          },
        }}
      >
        <Box
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(text || ""),
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
