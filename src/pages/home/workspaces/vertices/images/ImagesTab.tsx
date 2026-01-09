import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ZoomInIcon from "@mui/icons-material/ZoomIn";

import type { Vertex } from "@/core/vertex";
import type { Reference } from "@/core/common/reference";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";

type ImageRef = Extract<Reference, { type: "image" }>;

type ImagesTabProps = {
  vertex: Vertex;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
};

export const ImagesTab: React.FC<ImagesTabProps> = ({
  vertex,
  onVertexUpdated,
}) => {
  const { t } = useTranslation("common");
  const [images, setImages] = React.useState<ImageRef[]>(
    (vertex.references ?? []).filter((r): r is ImageRef => r.type === "image")
  );
  const [dragging, setDragging] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);
  const [alt, setAlt] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const imgs = (vertex.references ?? []).filter(
      (r): r is ImageRef => r.type === "image"
    );
    setImages(imgs);
    setSelectedIdx(null);
    setDialogOpen(false);
    setError(null);
  }, [vertex]);

  const persistImages = async (next: ImageRef[]) => {
    const others = (vertex.references ?? []).filter((r) => r.type !== "image");
    const updated: Vertex = {
      ...vertex,
      references: [...others, ...next],
      updated_at: new Date().toISOString(),
    };
    const fs = await getFileSystem();
    await fs.updateVertex(updated);
    setImages(next);
    await onVertexUpdated?.(updated);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    try {
      const newRefs: ImageRef[] = [];
      for (const file of Array.from(files)) {
        const data = await fileToDataUrl(file);
        newRefs.push({ type: "image", path: data });
      }
      await persistImages([...images, ...newRefs]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("imagesTab.errors.add"));
    } finally {
      setDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Invalid file"));
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const openDialog = (idx: number) => {
    setSelectedIdx(idx);
    setAlt(images[idx].alt ?? "");
    setDescription(images[idx].description ?? "");
    setDialogOpen(true);
  };

  const handleDialogSave = async () => {
    if (selectedIdx === null) return;
    const next = images.map((img, idx) =>
      idx === selectedIdx ? { ...img, alt, description } : img
    );
    await persistImages(next);
    setDialogOpen(false);
  };

  const handleDelete = async (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    await persistImages(next);
    if (selectedIdx === idx) {
      setDialogOpen(false);
      setSelectedIdx(null);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
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
      onDrop={async (e) => {
        e.preventDefault();
        await handleFiles(e.dataTransfer.files);
      }}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {t("imagesTab.title")}
        </Typography>
        <Typography color="text.secondary">
          {t("imagesTab.description")}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          border: dragging ? "2px dashed" : "1px dashed",
          borderColor: dragging ? "primary.main" : "divider",
          borderRadius: 2,
          p: 2,
          textAlign: "center",
          cursor: "pointer",
          bgcolor: dragging ? "action.hover" : "background.default",
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Typography>
          {t("imagesTab.dropzone")}
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </Box>

      {images.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
          {t("imagesTab.empty")}
        </Typography>
      ) : (
        <Box
          sx={{
            columnCount: { xs: 1, sm: 2, md: 3 },
            columnGap: 16,
            width: "100%",
          }}
        >
          {images.map((img, idx) => (
            <Box
              key={`${img.path}-${idx}`}
              sx={{
                breakInside: "avoid",
                position: "relative",
                mb: 2,
                borderRadius: 2,
                overflow: "hidden",
                boxShadow: 1,
              }}
            >
              <Box
                component="img"
                src={img.path}
                alt={img.alt ?? `Image ${idx + 1}`}
                sx={{
                  width: "100%",
                  display: "block",
                }}
                onClick={() => openDialog(idx)}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  display: "flex",
                  gap: 0.5,
                  bgcolor: "rgba(0,0,0,0.35)",
                  borderRadius: 999,
                  p: "2px",
                }}
              >
                <IconButton
                  size="small"
                  sx={{ color: "common.white" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openDialog(idx);
                  }}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  sx={{ color: "error.light" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(idx);
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
              {(img.alt || img.description) && (
                <Box sx={{ p: 1, bgcolor: "background.paper" }}>
                  <Typography variant="subtitle2">{img.alt}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {img.description}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Dialog
        open={dialogOpen && selectedIdx !== null}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t("imagesTab.editTitle")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {selectedIdx !== null && (
            <Box
              component="img"
              src={images[selectedIdx].path}
              alt={images[selectedIdx].alt}
              sx={{ width: "100%", borderRadius: 1 }}
            />
          )}
          <TextField
            label={t("imagesTab.alt")}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t("imagesTab.descriptionLabel")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t("commonActions.cancel")}</Button>
          <Button variant="contained" onClick={handleDialogSave}>
            {t("commonActions.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
