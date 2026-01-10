import * as React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { useTranslation } from "react-i18next";

type DeleteConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  title,
  message,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation("common");
  const os = React.useMemo(() => detectOperatingSystem(), []);
  const confirmShortcut = React.useMemo(
    () => getShortcut("confirmDelete", os),
    [os]
  );
  const cancelShortcut = React.useMemo(
    () => getShortcut("cancelDelete", os),
    [os]
  );

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, confirmShortcut)) {
        e.preventDefault();
        onConfirm();
      } else if (matchesShortcut(e, cancelShortcut)) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cancelShortcut, confirmShortcut, open, onCancel, onConfirm]);

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t("commonActions.cancel")}</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          {t("commonActions.delete")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
