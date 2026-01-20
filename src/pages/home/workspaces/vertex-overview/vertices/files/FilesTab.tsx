import * as React from "react";
import {
  Alert,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import AudiotrackOutlinedIcon from "@mui/icons-material/AudiotrackOutlined";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTranslation } from "react-i18next";

import type { Vertex } from "@/core/vertex";
import { DeleteConfirmDialog } from "../../../components/delete-confirm-dialog/DeleteConfirmDialog";
import { CreateFab } from "../../../components/create-fab/CreateFab";

type FilesTabProps = {
  vertex: Vertex;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
  refreshToken?: number;
};

type FileEntry = {
  name: string;
  path: string;
  ext: string;
};

const IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "tiff",
  "svg",
];

const EXCLUDED_EXTENSIONS = ["json", "md"];

const getExtension = (name: string) => {
  const parts = name.split(".");
  if (parts.length <= 1) return "";
  return (parts.pop() ?? "").toLowerCase();
};

const isExcludedName = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith(".")) return true;
  const ext = getExtension(trimmed);
  if (EXCLUDED_EXTENSIONS.includes(ext)) return true;
  return IMAGE_EXTENSIONS.includes(ext);
};

const isPointInside = (rect: DOMRect, x: number, y: number) => {
  const scale = window.devicePixelRatio || 1;
  const insideLogical =
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  const insidePhysical =
    x >= rect.left * scale &&
    x <= rect.right * scale &&
    y >= rect.top * scale &&
    y <= rect.bottom * scale;
  return insideLogical || insidePhysical;
};

const fileNameFromPath = (path: string) =>
  path.split(/[/\\]/).pop() ?? "file";

const resolveIcon = (ext: string) => {
  if (ext === "pdf") return PictureAsPdfOutlinedIcon;
  if (["doc", "docx", "rtf", "txt"].includes(ext)) {
    return DescriptionOutlinedIcon;
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return TableChartOutlinedIcon;
  }
  if (["mp3", "wav", "flac", "ogg", "m4a"].includes(ext)) {
    return AudiotrackOutlinedIcon;
  }
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) {
    return MovieOutlinedIcon;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return ArchiveOutlinedIcon;
  }
  if (["js", "ts", "tsx", "jsx", "css", "html"].includes(ext)) {
    return CodeOutlinedIcon;
  }
  return InsertDriveFileOutlinedIcon;
};

export const FilesTab: React.FC<FilesTabProps> = ({
  vertex,
  refreshToken,
}) => {
  const { t } = useTranslation("common");
  const [files, setFiles] = React.useState<FileEntry[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<FileEntry | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const hasLoadedRef = React.useRef(false);

  const loadFiles = React.useCallback(async () => {
    if (!vertex.asset_directory) {
      setFiles([]);
      return;
    }
    const isRefresh = hasLoadedRef.current;
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const { isTauri } = await import("@tauri-apps/api/core");
      if (!isTauri()) {
        setFiles([]);
        return;
      }
      const { readDir } = await import("@tauri-apps/plugin-fs");
      const { join } = await import("@tauri-apps/api/path");
      const entries = await readDir(vertex.asset_directory);
      const next: FileEntry[] = [];
      for (const entry of entries) {
        if (entry.isDirectory) continue;
        const name = entry.name?.trim();
        if (!name) continue;
        if (isExcludedName(name)) continue;
        const path = await join(vertex.asset_directory, name);
        next.push({ name, path, ext: getExtension(name) });
      }
      next.sort((a, b) => a.name.localeCompare(b.name));
      setFiles(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("filesTab.errors.load")
      );
      setFiles([]);
    } finally {
      if (!isRefresh) setLoading(false);
      hasLoadedRef.current = true;
    }
  }, [t, vertex.asset_directory]);

  React.useEffect(() => {
    void loadFiles();
  }, [loadFiles, refreshToken]);

  const handleFiles = React.useCallback(
    async (incoming: File[]) => {
      if (!incoming.length || !vertex.asset_directory) return;
      const allowed = incoming.filter((file) => !isExcludedName(file.name));
      if (allowed.length === 0) return;
      setError(null);
      try {
        const { isTauri } = await import("@tauri-apps/api/core");
        if (!isTauri()) {
          setError(t("filesTab.errors.unavailable"));
          return;
        }
        const { writeFile, exists } = await import("@tauri-apps/plugin-fs");
        const { join } = await import("@tauri-apps/api/path");

        for (const file of allowed) {
          const ext = getExtension(file.name);
          const base =
            ext && file.name.toLowerCase().endsWith(`.${ext}`)
              ? file.name.slice(0, -(ext.length + 1))
              : file.name;
          let candidate = file.name;
          let counter = 1;
          let targetPath = await join(vertex.asset_directory, candidate);
          while (await exists(targetPath)) {
            candidate = ext
              ? `${base} (${counter}).${ext}`
              : `${base} (${counter})`;
            counter += 1;
            targetPath = await join(vertex.asset_directory, candidate);
          }
          const data = new Uint8Array(await file.arrayBuffer());
          await writeFile(targetPath, data);
        }
        await loadFiles();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("filesTab.errors.add")
        );
      } finally {
        setDragging(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [loadFiles, t, vertex.asset_directory]
  );

  React.useEffect(() => {
    let unlisten: (() => void) | undefined;
    let canceled = false;
    const setup = async () => {
      const { isTauri } = await import("@tauri-apps/api/core");
      if (!isTauri()) return;
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { readFile } = await import("@tauri-apps/plugin-fs");
      unlisten = await getCurrentWindow().onDragDropEvent(async (event) => {
        if (canceled) return;
        const payload = event.payload as {
          type: "enter" | "over" | "drop" | "leave";
          paths?: string[];
          position?: { x: number; y: number };
        };
        const pos = "position" in payload ? payload.position : undefined;
        const rect = containerRef.current?.getBoundingClientRect();
        const isInside =
          pos && rect ? isPointInside(rect, pos.x, pos.y) : true;

        if (payload.type === "enter" || payload.type === "over") {
          setDragging(isInside);
          return;
        }
        if (payload.type === "leave") {
          setDragging(false);
          return;
        }
        if (payload.type === "drop") {
          if (!isInside) return;
          setDragging(false);
          const paths = (payload.paths ?? []).filter((path) => {
            const name = fileNameFromPath(path);
            return !isExcludedName(name);
          });
          if (paths.length === 0) return;
          const dropped = await Promise.all(
            paths.map(async (path) => {
              const data = await readFile(path);
              return new File([data], fileNameFromPath(path), {
                type: "application/octet-stream",
              });
            })
          );
          await handleFiles(dropped);
        }
      });
    };
    setup();
    return () => {
      canceled = true;
      unlisten?.();
    };
  }, [handleFiles]);

  const handleOpenFile = React.useCallback(async (path: string) => {
    try {
      const { isTauri, invoke } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        await invoke("fs_open_path", { path });
        return;
      }
      window.open(encodeURI(`file://${path}`), "_blank", "noreferrer");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("filesTab.errors.open")
      );
    }
  }, [t]);

  const handleDeleteFile = React.useCallback(
    async (target: FileEntry) => {
      try {
        const { isTauri } = await import("@tauri-apps/api/core");
        if (!isTauri()) return;
        const { remove } = await import("@tauri-apps/plugin-fs");
        await remove(target.path);
        await loadFiles();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("filesTab.errors.delete")
        );
      }
    },
    [loadFiles, t]
  );

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
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        {t("filesTab.title")}
      </Typography>
      <Typography color="text.secondary">
        {t("filesTab.description")}
      </Typography>

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
            {t("filesTab.loading")}
          </Typography>
        ) : files.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            {t("filesTab.empty")}
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(3, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
                lg: "repeat(5, minmax(0, 1fr))",
              },
              gap: 2,
              width: "100%",
            }}
          >
            {files.map((file) => {
              const Icon = resolveIcon(file.ext);
              return (
                <Box key={file.path} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box
                    sx={{
                      position: "relative",
                      borderRadius: 2,
                      overflow: "hidden",
                      boxShadow: 2,
                      backgroundColor: "background.paper",
                      height: 120,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 150ms ease, box-shadow 150ms ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: 4,
                      },
                      "&:hover [data-role='file-actions']": {
                        opacity: 1,
                      },
                    }}
                  >
                    <Icon fontSize="large" />
                    <Box
                      data-role="file-actions"
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
                        aria-label={t("filesTab.open")}
                        onClick={() => handleOpenFile(file.path)}
                      >
                        <ZoomInIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{ color: "error.light" }}
                        aria-label={t("commonActions.delete")}
                        onClick={() => setDeleteTarget(file)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    title={file.name}
                    sx={{ textAlign: "center" }}
                  >
                    {file.name}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("filesTab.deleteTitle")}
        message={t("filesTab.deletePrompt", {
          name: deleteTarget?.name ?? t("filesTab.deleteFallback"),
        })}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          await handleDeleteFile(target);
        }}
      />

      <CreateFab
        title={t("filesTab.upload")}
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
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          void handleFiles(Array.from(e.target.files ?? []));
        }}
      />
    </Box>
  );
};
