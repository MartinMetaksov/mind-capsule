import * as React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import LinkOffOutlinedIcon from "@mui/icons-material/LinkOffOutlined";
import { useTranslation } from "react-i18next";

import {
  CreateVertexDialog,
  CreateVertexForm,
} from "../../components/vertex-dialogs/VertexDialogs";
import { DeleteConfirmDialog } from "../../components/delete-confirm-dialog/DeleteConfirmDialog";
import type { DetachedProject } from "../hooks/useDetachedOverview";

type DetachedDialogsProps = {
  associateTarget: DetachedProject | null;
  createTarget: DetachedProject | null;
  deleteTarget: DetachedProject | null;
  createError: string | null;
  onCloseAssociate: () => void;
  onCreateFromAssociate: () => void;
  onCloseCreate: () => void;
  onSubmitCreate: (data: CreateVertexForm) => void | Promise<void>;
  onCancelDelete: () => void;
  onConfirmDelete: () => void | Promise<void>;
};

export const DetachedDialogs: React.FC<DetachedDialogsProps> = ({
  associateTarget,
  createTarget,
  deleteTarget,
  createError,
  onCloseAssociate,
  onCreateFromAssociate,
  onCloseCreate,
  onSubmitCreate,
  onCancelDelete,
  onConfirmDelete,
}) => {
  const { t } = useTranslation("common");

  return (
    <>
      <Dialog
        open={Boolean(associateTarget)}
        onClose={onCloseAssociate}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t("detachedTab.dialog.title")}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {t("detachedTab.dialog.description")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseAssociate}>{t("commonActions.cancel")}</Button>
          <Button startIcon={<LinkOffOutlinedIcon />} disabled variant="outlined">
            {t("detachedTab.dialog.associate")}
          </Button>
          <Button variant="contained" onClick={onCreateFromAssociate}>
            {t("detachedTab.dialog.create")}
          </Button>
        </DialogActions>
      </Dialog>

      <CreateVertexDialog
        open={Boolean(createTarget)}
        onClose={onCloseCreate}
        onSubmit={onSubmitCreate}
        workspaceLabel={createTarget?.workspace.name}
        submitLabel={t("detachedTab.dialog.create")}
        title={t("detachedTab.dialog.createTitle")}
      />
      {createError && (
        <Typography color="error" variant="body2" sx={{ px: 2, pt: 1 }}>
          {createError}
        </Typography>
      )}

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("detachedTab.delete.title")}
        message={t("detachedTab.delete.message", {
          name: deleteTarget?.name,
        })}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  );
};
