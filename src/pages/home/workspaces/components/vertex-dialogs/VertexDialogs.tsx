import * as React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { DeleteConfirmDialog } from "../delete-confirm-dialog/DeleteConfirmDialog";
import { useTranslation } from "react-i18next";

export type CreateVertexForm = {
  title: string;
  thumbnail?: string;
};

type CreateVertexDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateVertexForm) => void;
  workspaceLabel?: string;
  submitLabel?: string;
  title?: string;
};

export type ThumbnailPickerProps = {
  value?: string;
  onChange: (value?: string) => void;
  height?: number;
};

export const ThumbnailPicker: React.FC<ThumbnailPickerProps> = ({
  value,
  onChange,
  height = 150,
}) => {
  const [dragging, setDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const applyImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const result = reader.result as string;
        onChange(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Thumbnail
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          p: value ? 0 : 2,
          height: height,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          cursor: "pointer",
          bgcolor: "background.default",
          borderStyle: dragging ? "dashed" : "solid",
          borderWidth: 1,
          borderColor: dragging ? "primary.main" : "divider",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) applyImage(file);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        {value ? (
          <Box
            component="img"
            src={value}
            alt="thumbnail preview"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Drag & drop or click to add an image
          </Typography>
        )}
      </Paper>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) applyImage(file);
        }}
      />
    </Box>
  );
};

export const CreateVertexDialog: React.FC<CreateVertexDialogProps> = ({
  open,
  onClose,
  onSubmit,
  workspaceLabel,
  submitLabel = "Create",
  title = "Create item",
}) => {
  const { t } = useTranslation("common");
  const [form, setForm] = React.useState<CreateVertexForm>({
    title: "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const titleRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm({ title: "" });
      setError(null);
      requestAnimationFrame(() => {
        titleRef.current?.focus({ preventScroll: true });
      });
    }
  }, [open]);

  const handleSubmit = () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    onSubmit({ ...form, title: form.title.trim() });
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    handleSubmit();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2, pb: 1 }}
        onKeyDown={handleKeyDown}
      >
        {workspaceLabel && (
          <Typography variant="body2" color="text.secondary">
            {t("vertexDialog.workspaceLabel", { workspace: workspaceLabel })}
          </Typography>
        )}
        <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label={t("vertexDialog.fields.title")}
            fullWidth
            autoFocus
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
            inputRef={titleRef}
            InputLabelProps={{ shrink: true }}
          />
          <ThumbnailPicker
            value={form.thumbnail}
            onChange={(thumb) =>
              setForm((prev) => ({ ...prev, thumbnail: thumb }))
            }
          />
        </Box>
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pt: 2, pb: 3 }}>
        <Button onClick={onClose}>{t("commonActions.cancel")}</Button>
        <Button variant="contained" onClick={handleSubmit}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

type DeleteVertexDialogProps = {
  open: boolean;
  name?: string;
  onCancel: () => void;
  onConfirm: () => void;
  entityLabel?: string;
};

export const DeleteVertexDialog: React.FC<DeleteVertexDialogProps> = ({
  open,
  name,
  onCancel,
  onConfirm,
  entityLabel = "item",
}) => {
  const { t } = useTranslation("common");
  const title = t("vertexDialog.deleteTitle", { entity: entityLabel });
  const message = t("vertexDialog.deletePrompt", {
    name: name ?? t("vertexDialog.deleteFallback", { entity: entityLabel }),
  });

  return (
    <DeleteConfirmDialog
      open={open}
      title={title}
      message={message}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};
