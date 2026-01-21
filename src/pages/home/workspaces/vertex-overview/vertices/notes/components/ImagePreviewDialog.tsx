import * as React from "react";
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";

type ImagePreviewDialogProps = {
  open: boolean;
  title: string;
  path: string;
  onClose: () => void;
};

export const ImagePreviewDialog: React.FC<ImagePreviewDialogProps> = ({
  open,
  title,
  path,
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
          p: 0,
          bgcolor: "background.default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          component="img"
          src={path}
          alt={title}
          sx={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
