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
  Paper,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import LinkOffOutlinedIcon from "@mui/icons-material/LinkOffOutlined";

import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";
import {
  CreateVertexDialog,
  CreateVertexForm,
} from "../components/vertex-dialogs/VertexDialogs";
import { DeleteConfirmDialog } from "../components/delete-confirm-dialog/DeleteConfirmDialog";
import { VERTEX_NODE_HEIGHT, VERTEX_NODE_WIDTH } from "../vertices/vertex-node/VertexNode";

type DetachedProject = {
  name: string;
  path: string;
  workspace: Workspace;
};

type DetachedProjectsTabProps = {
  workspaces: Workspace[];
  onChanged: () => Promise<void>;
  onDetachedCountChange?: (count: number) => void;
};

const getAssetDirectory = (workspacePath: string, vertexId: string) => {
  const trimmed = workspacePath.replace(/[\\/]+$/, "");
  return `${trimmed}/${vertexId}`;
};

export const DetachedProjectsTab: React.FC<DetachedProjectsTabProps> = ({
  workspaces,
  onChanged,
  onDetachedCountChange,
}) => {
  const { t } = useTranslation("common");
  const [items, setItems] = React.useState<DetachedProject[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [associateTarget, setAssociateTarget] =
    React.useState<DetachedProject | null>(null);
  const [createTarget, setCreateTarget] =
    React.useState<DetachedProject | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<DetachedProject | null>(null);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const loadDetached = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { isTauri } = await import("@tauri-apps/api/core");
      if (!isTauri()) {
        setItems([]);
        return;
      }
      const fs = await getFileSystem();
      const vertices = await fs.getAllVertices();
      const knownVertexIds = new Set(vertices.map((v) => v.id));
      const { readDir } = await import("@tauri-apps/plugin-fs");

      const next: DetachedProject[] = [];
      for (const ws of workspaces) {
        const entries = await readDir(ws.path);
        entries.forEach((entry) => {
          if (!entry.isDirectory) return;
          const name = entry.name?.trim();
          if (!name) return;
          if (name.startsWith(".")) return;
          if (knownVertexIds.has(name)) return;
          const path = `${ws.path.replace(/[\\/]+$/, "")}/${name}`;
          next.push({ name, path, workspace: ws });
        });
      }
      next.sort((a, b) => a.name.localeCompare(b.name));
      setItems(next);
      onDetachedCountChange?.(next.length);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("detachedTab.errors.load")
      );
      setItems([]);
      onDetachedCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [onDetachedCountChange, t, workspaces]);

  React.useEffect(() => {
    loadDetached();
  }, [loadDetached]);

  const handleOpenFolder = async (path: string) => {
    try {
      const { isTauri, invoke } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        await invoke("fs_open_path", { path });
        return;
      }
      window.open(encodeURI(`file://${path}`), "_blank", "noreferrer");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("detachedTab.errors.open")
      );
    }
  };

  const handleCreateFromDetached = async (data: CreateVertexForm) => {
    if (!createTarget) return;
    setCreateError(null);
    try {
      const fs = await getFileSystem();
      const now = new Date().toISOString();
      const vertex: Vertex = {
        id: crypto.randomUUID(),
        title: data.title,
        asset_directory: "",
        parent_id: null,
        workspace_id: createTarget.workspace.id,
        default_tab: "items",
        created_at: now,
        updated_at: now,
        tags: [],
        thumbnail_path: data.thumbnail,
      };
      await fs.createVertex(vertex);

      const { isTauri } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        const { remove, rename } = await import("@tauri-apps/plugin-fs");
        const assetDirectory = getAssetDirectory(
          createTarget.workspace.path,
          vertex.id
        );
        await remove(assetDirectory, { recursive: true });
        await rename(createTarget.path, assetDirectory);
      }

      setCreateTarget(null);
      setAssociateTarget(null);
      await onChanged();
      await loadDetached();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : t("detachedTab.errors.create")
      );
    }
  };

  const handleDeleteDetached = async (target: DetachedProject) => {
    setError(null);
    try {
      const { isTauri } = await import("@tauri-apps/api/core");
      if (!isTauri()) return;
      const { remove } = await import("@tauri-apps/plugin-fs");
      await remove(target.path, { recursive: true });
      await loadDetached();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("detachedTab.errors.delete")
      );
    }
  };

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pt: 6.5,
        minHeight: 0,
      }}
    >
      <Box sx={{ px: 2, pb: 2, pt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {t("detachedTab.title")}
        </Typography>
        <Typography color="text.secondary">
          {t("detachedTab.subtitle")}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Typography color="text.secondary" sx={{ mt: 3 }}>
            {t("detachedTab.loading")}
          </Typography>
        ) : items.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mt: 2,
            }}
          >
            <Typography color="text.secondary" align="center">
              {t("detachedTab.empty")}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              width: "100%",
              minHeight: 0,
              overflowY: "auto",
              py: 2,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gap: 3,
                width: "100%",
                maxWidth: "100%",
                mx: 0,
                gridTemplateColumns: `repeat(auto-fit, minmax(${VERTEX_NODE_WIDTH}px, ${VERTEX_NODE_WIDTH}px))`,
                justifyContent: "flex-start",
                justifyItems: "start",
                alignItems: "start",
              }}
            >
              {items.map((item) => (
                <Box
                  key={`${item.workspace.id}-${item.name}`}
                  sx={{
                    width: VERTEX_NODE_WIDTH,
                    height: VERTEX_NODE_HEIGHT + 10,
                    pointerEvents: "auto",
                  }}
                >
                  <Paper
                    onClick={() => setAssociateTarget(item)}
                    role="button"
                    tabIndex={0}
                    elevation={1}
                    sx={(theme) => ({
                      width: VERTEX_NODE_WIDTH,
                      height: VERTEX_NODE_HEIGHT,
                      borderRadius: 1,
                      overflow: "hidden",
                      cursor: "pointer",
                      userSelect: "none",
                      position: "relative",
                      outline: "none",
                      border: `1px solid ${theme.palette.divider}`,
                      background:
                        theme.palette.mode === "dark"
                          ? "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))"
                          : "linear-gradient(145deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02))",
                      "&:hover": { borderColor: theme.palette.primary.main },
                    })}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        display: "flex",
                        gap: 1,
                        zIndex: 2,
                      }}
                    >
                      <IconButton
                        size="small"
                        sx={{ bgcolor: "background.paper" }}
                        aria-label={t("detachedTab.openFolder")}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFolder(item.path);
                        }}
                      >
                        <FolderOpenOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{ bgcolor: "background.paper" }}
                        aria-label={t("commonActions.delete")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(item);
                        }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.74), rgba(0,0,0,0.22) 55%, rgba(0,0,0,0.08))",
                        pointerEvents: "none",
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        left: 14,
                        right: 14,
                        bottom: 14,
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.25,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "common.white",
                          opacity: 0.9,
                          fontWeight: 700,
                          textShadow: "0 1px 8px rgba(0,0,0,0.35)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={item.workspace.name}
                      >
                        {item.workspace.name}
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          color: "common.white",
                          fontWeight: 900,
                          lineHeight: 1.15,
                          textShadow: "0 1px 10px rgba(0,0,0,0.42)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.name}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      <Dialog
        open={Boolean(associateTarget)}
        onClose={() => setAssociateTarget(null)}
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
          <Button onClick={() => setAssociateTarget(null)}>
            {t("commonActions.cancel")}
          </Button>
          <Button
            startIcon={<LinkOffOutlinedIcon />}
            disabled
            variant="outlined"
          >
            {t("detachedTab.dialog.associate")}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setCreateTarget(associateTarget);
              setAssociateTarget(null);
            }}
          >
            {t("detachedTab.dialog.create")}
          </Button>
        </DialogActions>
      </Dialog>

      <CreateVertexDialog
        open={Boolean(createTarget)}
        onClose={() => {
          setCreateTarget(null);
          setCreateError(null);
        }}
        onSubmit={handleCreateFromDetached}
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
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          await handleDeleteDetached(target);
        }}
      />
    </Box>
  );
};
