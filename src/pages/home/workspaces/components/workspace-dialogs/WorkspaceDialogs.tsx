import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import type { Workspace } from "@/core/workspace";
import { useTranslation } from "react-i18next";
import { DeleteConfirmDialog } from "../delete-confirm-dialog/DeleteConfirmDialog";

export type WorkspaceFormData = Pick<Workspace, "name" | "path"> & {
  id?: string;
};

type WorkspaceDialogProps = {
  open: boolean;
  initial?: WorkspaceFormData;
  error?: string | null;
  titleOverride?: string;
  submitLabelOverride?: string;
  onClose: () => void;
  onSubmit: (data: WorkspaceFormData) => void;
  onPickPath?: () => Promise<string | null | undefined>;
};

export const WorkspaceDialog: React.FC<WorkspaceDialogProps> = ({
  open,
  initial,
  error,
  titleOverride,
  submitLabelOverride,
  onClose,
  onSubmit,
  onPickPath,
}) => {
  const { t } = useTranslation("common");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<WorkspaceFormData>({
    id: initial?.id,
    name: initial?.name ?? "",
    path: initial?.path ?? "",
  });

  React.useEffect(() => {
    if (!open) return;
    setData({
      id: initial?.id,
      name: initial?.name ?? "",
      path: initial?.path ?? "",
    });
    setFormError(null);
  }, [initial, open]);

  const handleSubmit = () => {
    if (!data.name.trim() || !data.path.trim()) {
      setFormError(t("workspaces.errors.required"));
      return;
    }
    onSubmit({
      ...data,
      name: data.name.trim(),
      path: data.path.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {data.id
          ? t("workspaces.editTitle")
          : titleOverride ?? t("workspaces.createTitle")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 2, pb: 1 }}>
          <TextField
            label={t("workspaces.fields.name")}
            fullWidth
            value={data.name}
            onChange={(e) =>
              setData((prev) => ({ ...prev, name: e.target.value }))
            }
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label={t("workspaces.fields.path")}
            fullWidth
            value={data.path}
            onChange={(e) =>
              setData((prev) => ({ ...prev, path: e.target.value }))
            }
            slotProps={{
              inputLabel: { shrink: true },
              input: onPickPath
                ? {
                    endAdornment: (
                      <Button
                        size="small"
                        onClick={async () => {
                          const selected = await onPickPath();
                          if (selected) {
                            setData((prev) => ({ ...prev, path: selected }));
                          }
                        }}
                      >
                        {t("workspaces.actions.selectDirectory")}
                      </Button>
                    ),
                  }
                : undefined,
            }}
          />
          {(formError || error) && (
            <Typography color="error" variant="body2">
              {formError || error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("commonActions.cancel")}</Button>
        <Button variant="contained" onClick={handleSubmit}>
          {data.id
            ? t("commonActions.save")
            : submitLabelOverride ?? t("commonActions.create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

type DeleteWorkspaceDialogProps = {
  open: boolean;
  name?: string;
  titleOverride?: string;
  confirmLabelOverride?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export const DeleteWorkspaceDialog: React.FC<DeleteWorkspaceDialogProps> = ({
  open,
  name,
  titleOverride,
  confirmLabelOverride,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation("common");
  return (
    <DeleteConfirmDialog
      open={open}
      title={titleOverride ?? t("workspaces.deleteTitle")}
      message={t("workspaces.deleteConfirm", {
        name: name ?? t("workspaces.deleteFallback"),
      })}
      confirmLabel={confirmLabelOverride}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};
