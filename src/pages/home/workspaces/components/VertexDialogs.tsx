import * as React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import type { VertexKind } from "@/core/common/vertexKind";

export type CreateVertexForm = {
  title: string;
  kind: VertexKind;
  thumbnail?: string;
};

type CreateVertexDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateVertexForm) => void;
  workspaceLabel?: string;
  defaultKind?: VertexKind;
  submitLabel?: string;
  title?: string;
};

export const CreateVertexDialog: React.FC<CreateVertexDialogProps> = ({
  open,
  onClose,
  onSubmit,
  workspaceLabel,
  defaultKind = "project",
  submitLabel = "Create",
  title = "Create item",
}) => {
  const [form, setForm] = React.useState<CreateVertexForm>({
    title: "",
    kind: defaultKind,
  });
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm({ title: "", kind: defaultKind });
      setError(null);
      setDragging(false);
    }
  }, [defaultKind, open]);

  const applyImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const result = reader.result as string;
        setForm((prev) => ({ ...prev, thumbnail: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    onSubmit({ ...form, title: form.title.trim() });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2, pb: 1 }}>
        {workspaceLabel && (
          <Typography variant="body2" color="text.secondary">
            Workspace: {workspaceLabel}
          </Typography>
        )}
        <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Title"
            fullWidth
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Kind"
            select
            fullWidth
            value={form.kind}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, kind: e.target.value as VertexKind }))
            }
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="project">Project</MenuItem>
            <MenuItem value="chapter">Chapter</MenuItem>
            <MenuItem value="section">Section</MenuItem>
            <MenuItem value="note">Note</MenuItem>
            <MenuItem value="generic">Generic</MenuItem>
          </TextField>
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Thumbnail
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                textAlign: "center",
                cursor: "pointer",
                bgcolor: "background.default",
                minHeight: 260,
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
              {form.thumbnail ? (
                <Box
                  component="img"
                  src={form.thumbnail}
                  alt="thumbnail preview"
                  sx={{ maxWidth: "100%", maxHeight: 160, borderRadius: 1 }}
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
        </Box>
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
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
}) => (
  <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
    <DialogTitle>Delete {entityLabel}</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Are you sure you want to delete <strong>{name ?? `this ${entityLabel}`}</strong>?
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>Cancel</Button>
      <Button color="error" variant="contained" onClick={onConfirm}>
        Delete
      </Button>
    </DialogActions>
  </Dialog>
);
