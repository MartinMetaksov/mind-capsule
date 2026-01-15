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
import type { ImageEntry } from "@/integrations/fileSystem/fileSystem";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";
import { DeleteConfirmDialog } from "../../components/delete-confirm-dialog/DeleteConfirmDialog";

type ImagesTabProps = {
  vertex: Vertex;
};

export const ImagesTab: React.FC<ImagesTabProps> = ({
  vertex,
}) => {
  const { t } = useTranslation("common");
  const [images, setImages] = React.useState<ImageEntry[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    name: string;
    label: string;
  } | null>(null);
  const [alt, setAlt] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const loadImages = async () => {
      setLoading(true);
      setError(null);
      try {
        const fs = await getFileSystem();
        const list = await fs.listImages(vertex);
        setImages(list);
        setSelectedIdx(null);
        setDialogOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("imagesTab.errors.add"));
        setImages([]);
      } finally {
        setLoading(false);
      }
    };
    loadImages();
  }, [t, vertex]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    try {
      const fs = await getFileSystem();
      const created = await Promise.all(
        Array.from(files).map((file) => fs.createImage(vertex, file))
      );
      setImages((prev) => [...prev, ...created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("imagesTab.errors.add"));
    } finally {
      setDragging(false);
    }
  };

  const openDialog = (idx: number) => {
    setSelectedIdx(idx);
    setAlt(images[idx].alt ?? "");
    setDescription(images[idx].description ?? "");
    setDialogOpen(true);
  };

  const handleDialogSave = async () => {
    if (selectedIdx === null) return;
    try {
      const target = images[selectedIdx];
      const fs = await getFileSystem();
      const updated = await fs.updateImageMetadata(vertex, target.name, {
        alt,
        description,
      });
      if (updated) {
        setImages((prev) =>
          prev.map((img, idx) => (idx === selectedIdx ? updated : img))
        );
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("imagesTab.errors.add"));
    }
  };

  const handleDelete = async (targetName: string) => {
    try {
      const fs = await getFileSystem();
      await fs.deleteImage(vertex, targetName);
      setImages((prev) => prev.filter((img) => img.name !== targetName));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("imagesTab.errors.add"));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const deletingName = deleteTarget.name;
    if (selectedIdx !== null && images[selectedIdx]?.name === deletingName) {
      setDialogOpen(false);
      setSelectedIdx(null);
    }
    setDeleteTarget(null);
    await handleDelete(deletingName);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        position: "relative",
        flex: 1,
        minHeight: "100%",
        alignSelf: "stretch",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragging(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={async (e) => {
        e.preventDefault();
        await handleFiles(e.dataTransfer.files);
      }}
    >
      {dragging && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.14)"
                : "rgba(0, 0, 0, 0.08)",
            opacity: 1,
            pointerEvents: "none",
            zIndex: 1,
            outline: (theme) =>
              `2px dashed ${
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.35)"
                  : "rgba(0, 0, 0, 0.2)"
              }`,
            outlineOffset: -6,
          }}
        />
      )}
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
          flex: 1,
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            {t("imagesTab.loading")}
          </Typography>
        ) : images.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            {t("imagesTab.empty")}
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2,
              width: "100%",
            }}
          >
            {images.map((img, idx) => (
              <Box
                key={img.name}
                sx={{
                  position: "relative",
                  borderRadius: 0,
                  overflow: "hidden",
                  boxShadow: 2,
                  cursor: "pointer",
                  aspectRatio: "4 / 3",
                  backgroundColor: "background.paper",
                  transition: "transform 150ms ease, box-shadow 150ms ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 4,
                  },
                  "&:hover [data-role='image-actions']": {
                    opacity: 1,
                  },
                  "&:hover [data-role='image-overlay']": {
                    opacity: 1,
                  },
                }}
                onClick={() => openDialog(idx)}
              >
                <Box
                  component="img"
                  src={img.path}
                  alt={img.alt ?? `Image ${idx + 1}`}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <Box
                  data-role="image-overlay"
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 100%)",
                    opacity: 0.9,
                    transition: "opacity 150ms ease",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    left: 12,
                    right: 12,
                    bottom: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.25,
                    color: "common.white",
                    textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {img.alt || img.name}
                  </Typography>
                  {img.description && (
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      {img.description}
                    </Typography>
                  )}
                </Box>
                <Box
                  data-role="image-actions"
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    display: "flex",
                    gap: 0.5,
                    bgcolor: "rgba(0,0,0,0.45)",
                    borderRadius: 999,
                    p: "2px",
                    opacity: 0,
                    transition: "opacity 150ms ease",
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
                    aria-label={t("commonActions.delete")}
                    onClick={(e) => {
                      e.stopPropagation();
                      const label =
                        img.alt?.trim() ||
                        img.name ||
                        t("imagesTab.deleteFallback");
                      setDeleteTarget({ name: img.name, label });
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Dialog
        open={dialogOpen && selectedIdx !== null}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t("imagesTab.editTitle")}</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {selectedIdx !== null && (
            <Box
              component="img"
              src={images[selectedIdx].path}
              alt={images[selectedIdx].alt}
              sx={{ width: "100%", borderRadius: 0 }}
            />
          )}
          <TextField
            label={t("imagesTab.alt")}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label={t("imagesTab.descriptionLabel")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {t("commonActions.cancel")}
          </Button>
          <Button variant="contained" onClick={handleDialogSave}>
            {t("commonActions.save")}
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("imagesTab.deleteTitle")}
        message={t("imagesTab.deletePrompt", {
          name: deleteTarget?.label ?? t("imagesTab.deleteFallback"),
        })}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
};
