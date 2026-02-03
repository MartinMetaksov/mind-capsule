import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import CloseIcon from "@mui/icons-material/Close";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

import type { Vertex } from "@/core/vertex";
import type { ImageEntry } from "@/integrations/fileSystem/fileSystem";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";
import { DeleteConfirmDialog } from "../../../components/delete-confirm-dialog/DeleteConfirmDialog";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { CreateFab } from "../../../components/create-fab/CreateFab";
import { useTauriImageDrop } from "@/utils/useTauriImageDrop";
import { ReorderableGrid } from "../../common/ReorderableGrid";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";

type ImagesTabProps = {
  vertex: Vertex;
  refreshToken?: number;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
};

export const ImagesTab: React.FC<ImagesTabProps> = ({
  vertex,
  refreshToken,
  onVertexUpdated,
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
  const assetDirectory = vertex.asset_directory;
  const os = React.useMemo(() => detectOperatingSystem(), []);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const hasLoadedRef = React.useRef(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const orderMap = React.useMemo(() => {
    if (vertex.images_layout?.mode !== "linear") return null;
    return vertex.images_layout.order;
  }, [vertex.images_layout]);

  const sortImages = React.useCallback(
    (list: ImageEntry[]) => {
      if (!orderMap) {
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      }
      return [...list].sort((a, b) => {
        const aOrder = orderMap[a.name];
        const bOrder = orderMap[b.name];
        if (aOrder != null && bOrder != null) return aOrder - bOrder;
        if (aOrder != null) return -1;
        if (bOrder != null) return 1;
        return a.name.localeCompare(b.name);
      });
    },
    [orderMap]
  );

  const buildOrderMap = React.useCallback(
    (list: ImageEntry[]) =>
      list.reduce<Record<string, number>>((acc, img, idx) => {
        acc[img.name] = idx;
        return acc;
      }, {}),
    []
  );

  const moveItem = React.useCallback(
    (list: ImageEntry[], sourceId: string, targetId: string) => {
      const fromIndex = list.findIndex((item) => item.name === sourceId);
      const toIndex = list.findIndex((item) => item.name === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list;
      const next = [...list];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    },
    []
  );

  React.useEffect(() => {
    if (dialogOpen) return;
    const loadImages = async () => {
      const isRefresh = hasLoadedRef.current;
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const fs = await getFileSystem();
        const list = await fs.listImages(vertex);
        setImages(sortImages(list));
        setSelectedIdx(null);
        setDialogOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("imagesTab.errors.add"));
        setImages([]);
      } finally {
        if (!isRefresh) setLoading(false);
        hasLoadedRef.current = true;
      }
    };
    loadImages();
  }, [dialogOpen, refreshToken, sortImages, t, vertex]);

  const handleFiles = React.useCallback(async (files: File[]) => {
    if (!files.length) return;
    setError(null);
    try {
      const fs = await getFileSystem();
      const created = await Promise.all(
        files.map((file) => fs.createImage(vertex, file))
      );
      setImages((prev) => [...prev, ...created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("imagesTab.errors.add"));
    } finally {
      setDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [t, vertex]);

  useTauriImageDrop({
    containerRef,
    onHoverChange: setDragging,
    onDropFiles: handleFiles,
  });

  const openDialog = (idx: number) => {
    setSelectedIdx(idx);
    setAlt(images[idx].alt ?? "");
    setDescription(images[idx].description ?? "");
    setDialogOpen(true);
  };

  const switchImage = React.useCallback(
    (nextIdx: number) => {
      if (!images[nextIdx]) return;
      setSelectedIdx(nextIdx);
      setAlt(images[nextIdx].alt ?? "");
      setDescription(images[nextIdx].description ?? "");
    },
    [images]
  );

  const handleNext = React.useCallback(() => {
    if (images.length === 0) return;
    const current = selectedIdx ?? 0;
    const next = (current + 1) % images.length;
    switchImage(next);
  }, [images, selectedIdx, switchImage]);

  const handlePrev = React.useCallback(() => {
    if (images.length === 0) return;
    const current = selectedIdx ?? 0;
    const prev = (current - 1 + images.length) % images.length;
    switchImage(prev);
  }, [images, selectedIdx, switchImage]);

  React.useEffect(() => {
    if (!dialogOpen) return;
    const prevShortcut = getShortcut("imagePrev", os);
    const nextShortcut = getShortcut("imageNext", os);
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (matchesShortcut(event, prevShortcut)) {
        event.preventDefault();
        handlePrev();
      } else if (matchesShortcut(event, nextShortcut)) {
        event.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dialogOpen, handleNext, handlePrev, os]);

  React.useEffect(() => {
    if (dialogOpen) return;
    const insertShortcut = getShortcut("insert", os);
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (matchesShortcut(event, insertShortcut)) {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dialogOpen, os]);

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

  const handleReorder = React.useCallback(
    async (sourceId: string, targetId: string) => {
      const next = moveItem(images, sourceId, targetId);
      setImages(next);
      const nextOrder = buildOrderMap(next);
      try {
        const fs = await getFileSystem();
        const updated: Vertex = {
          ...vertex,
          images_layout: { mode: "linear", order: nextOrder },
          updated_at: new Date().toISOString(),
        };
        await fs.updateVertex(updated);
        await onVertexUpdated?.(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("imagesTab.errors.add"));
      }
    },
    [buildOrderMap, images, moveItem, onVertexUpdated, t, vertex]
  );

  const handleRevealImage = React.useCallback(async (imageName: string) => {
    if (!assetDirectory || !imageName) return;
    const base = assetDirectory.replace(/[\\/]+$/, "");
    const targetPath = `${base}/${imageName}`;
    try {
      const { isTauri, invoke } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        await invoke("fs_open_path", { path: targetPath });
        return;
      }
    } catch {
      // fall back to browser navigation
    }
    window.open(encodeURI(`file://${targetPath}`), "_blank", "noreferrer");
  }, [assetDirectory]);

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
      ref={containerRef}
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
        await handleFiles(Array.from(e.dataTransfer.files ?? []));
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
          <ReorderableGrid
            items={images}
            getId={(item) => item.name}
            itemWidth={260}
            itemHeight={195}
            gap={24}
            scrollY={false}
            onReorder={handleReorder}
            dragLabel={t("commonActions.reorder")}
            renderItem={(img, state) => (
              <Box
                sx={{
                  position: "relative",
                  borderRadius: 0,
                  overflow: "hidden",
                  boxShadow: 2,
                  cursor: "pointer",
                  height: "100%",
                  backgroundColor: "background.paper",
                  transition: "transform 150ms ease, box-shadow 150ms ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 4,
                  },
                  "&:hover [data-role='image-actions']": {
                    opacity: 1,
                  },
                  "&:hover [data-role='image-drag']": {
                    opacity: 1,
                  },
                  "&:hover [data-role='image-overlay']": {
                    opacity: 1,
                  },
                }}
                onClick={() => openDialog(images.findIndex((entry) => entry.name === img.name))}
              >
                <Box
                  component="img"
                  src={img.path}
                  alt={img.alt ?? img.name}
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
                      openDialog(images.findIndex((entry) => entry.name === img.name));
                    }}
                  >
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    sx={{ color: "common.white" }}
                    aria-label={t("imagesTab.openFolder")}
                    disabled={!assetDirectory}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleRevealImage(img.name);
                    }}
                  >
                    <FolderOpenOutlinedIcon fontSize="small" />
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
                <Box
                  data-role="image-drag"
                  sx={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    opacity: 0,
                    transition: "opacity 150ms ease",
                  }}
                >
                  <IconButton
                    size="small"
                    draggable={false}
                    aria-label={t("commonActions.reorder")}
                    onPointerDown={state.dragHandleProps?.onPointerDown}
                    sx={{
                      cursor: "grab",
                      bgcolor: "rgba(0,0,0,0.45)",
                      color: "common.white",
                      boxShadow: 2,
                      "&:hover": {
                        bgcolor: "rgba(0,0,0,0.6)",
                      },
                    }}
                  >
                    <DragIndicatorRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            )}
          />
        )}
      </Box>

      <Dialog
        open={dialogOpen && selectedIdx !== null}
        onClose={() => setDialogOpen(false)}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: "background.default",
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 24,
              right: 24,
              display: "flex",
              gap: 1,
              alignItems: "center",
              zIndex: 2,
            }}
          >
            <Button
              size="small"
              variant="contained"
              onClick={handleDialogSave}
              sx={{ textTransform: "none" }}
            >
              {t("commonActions.save")}
            </Button>
            <IconButton
              size="small"
              aria-label={t("commonActions.cancel")}
              onClick={() => setDialogOpen(false)}
              sx={{ color: "text.secondary" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 2, md: 3 },
              p: { xs: 2, md: 3 },
              pt: { xs: 8, md: 9 },
              alignItems: "stretch",
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.default",
                position: "relative",
              }}
            >
              {selectedIdx !== null && (
                <Box
                  component="img"
                  src={images[selectedIdx].path}
                  alt={images[selectedIdx].alt}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: 0,
                    backgroundColor: "background.default",
                  }}
                />
              )}
              <IconButton
                aria-label={t("imagesTab.previous")}
                onClick={handlePrev}
                sx={(theme) => ({
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(0, 0, 0, 0.45)"
                      : "rgba(255, 255, 255, 0.7)",
                  color: "text.primary",
                  "&:hover": {
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(0, 0, 0, 0.6)"
                        : "rgba(255, 255, 255, 0.9)",
                  },
                })}
              >
                <NavigateBeforeIcon />
              </IconButton>
              <IconButton
                aria-label={t("imagesTab.next")}
                onClick={handleNext}
                sx={(theme) => ({
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(0, 0, 0, 0.45)"
                      : "rgba(255, 255, 255, 0.7)",
                  color: "text.primary",
                  "&:hover": {
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(0, 0, 0, 0.6)"
                        : "rgba(255, 255, 255, 0.9)",
                  },
                })}
              >
                <NavigateNextIcon />
              </IconButton>
            </Box>
            <Box
              sx={(theme) => ({
                width: { xs: "100%", md: 320 },
                display: "grid",
                alignContent: "start",
                gap: 1,
                p: 1.5,
                borderRadius: 2,
                background:
                  theme.palette.mode === "dark"
                    ? "rgba(10, 10, 12, 0.55)"
                    : "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(8px)",
                border: `1px solid ${theme.palette.divider}`,
              })}
            >
              <TextField
                label={t("imagesTab.alt")}
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                size="small"
                sx={(theme) => ({
                  "& .MuiInputBase-root": {
                    paddingTop: 0,
                    paddingBottom: 0,
                    minHeight: 40,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(0, 0, 0, 0.35)"
                        : "rgba(255, 255, 255, 0.65)",
                  },
                })}
              />
              <TextField
                label={t("imagesTab.descriptionLabel")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                minRows={2}
                slotProps={{ inputLabel: { shrink: true } }}
                size="small"
                sx={(theme) => ({
                  "& .MuiInputBase-root": {
                    minHeight: 64,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(0, 0, 0, 0.35)"
                        : "rgba(255, 255, 255, 0.65)",
                  },
                })}
              />
            </Box>
          </Box>
        </DialogContent>
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

      <CreateFab
        title={t("imagesTab.upload")}
        onClick={() => fileInputRef.current?.click()}
        sx={{
          position: "fixed",
          right: 20,
          bottom: 94,
          zIndex: 1300,
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          void handleFiles(Array.from(e.target.files ?? []));
        }}
      />
    </Box>
  );
};
