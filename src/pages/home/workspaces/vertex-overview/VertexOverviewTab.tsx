import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popover,
  TextField,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import LinkOffOutlinedIcon from "@mui/icons-material/LinkOffOutlined";

import { VertexGrid, VertexItem } from "../vertices/vertex-grid/VertexGrid";
import {
  CreateFab,
  type CreateFabHandle,
} from "../components/create-fab/CreateFab";
import {
  CreateVertexDialog,
  DeleteVertexDialog,
  CreateVertexForm,
} from "../components/vertex-dialogs/VertexDialogs";
import { DeleteConfirmDialog } from "../components/delete-confirm-dialog/DeleteConfirmDialog";
import { VERTEX_NODE_HEIGHT, VERTEX_NODE_WIDTH } from "../vertices/vertex-node/VertexNode";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { useTranslation } from "react-i18next";

type ItemsOverviewProps = {
  variant: "items";
  label: string;
  vertex: Vertex;
  workspace: Workspace;
  onOpenVertex?: (vertexId: string) => void;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
};

type ProjectsOverviewProps = {
  variant: "projects";
  title?: string;
  items: VertexItem[];
  workspaces: Workspace[];
  onOpenVertex: (vertexId: string) => void;
  onDeleteProject: (vertexId: string) => void;
  onChanged: () => Promise<void>;
};

type DetachedOverviewProps = {
  variant: "detached";
  workspaces: Workspace[];
  onChanged: () => Promise<void>;
  onDetachedCountChange?: (count: number) => void;
};

export type VertexOverviewTabProps =
  | ItemsOverviewProps
  | ProjectsOverviewProps
  | DetachedOverviewProps;

type DetachedProject = {
  name: string;
  path: string;
  workspace: Workspace;
};

const getAssetDirectory = (workspacePath: string, vertexId: string) => {
  const trimmed = workspacePath.replace(/[\\/]+$/, "");
  return `${trimmed}/${vertexId}`;
};

const ItemsOverview: React.FC<ItemsOverviewProps> = ({
  label,
  vertex,
  workspace,
  onOpenVertex,
  onVertexUpdated,
}) => {
  const { t } = useTranslation("common");
  const fabRef = React.useRef<CreateFabHandle | null>(null);
  const os = React.useMemo(() => detectOperatingSystem(), []);
  const createShortcut = React.useMemo(() => getShortcut("insert", os), [os]);
  const emptyLabel = React.useMemo(() => {
    const kind = vertex.items_behavior?.child_kind?.trim();
    if (!kind) return "items";
    return kind;
  }, [vertex.items_behavior?.child_kind]);

  const [items, setItems] = React.useState<VertexItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<VertexItem | null>(
    null
  );
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [editingLabel, setEditingLabel] = React.useState(false);
  const [labelDraft, setLabelDraft] = React.useState(label);
  const [labelSaving, setLabelSaving] = React.useState(false);
  const labelInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!editingLabel) {
      setLabelDraft(label);
    }
  }, [editingLabel, label]);

  React.useEffect(() => {
    if (!editingLabel || !labelInputRef.current) return;
    labelInputRef.current.focus();
    labelInputRef.current.select();
  }, [editingLabel]);

  const handleLabelCommit = React.useCallback(
    async (nextValue?: string) => {
      const trimmed = (nextValue ?? labelDraft).trim();
      const nextKind = trimmed.length > 0 ? trimmed : "";
      const currentKind = vertex.items_behavior?.child_kind ?? "";
      setEditingLabel(false);
      if (nextKind === currentKind) {
        return;
      }
      try {
        setLabelSaving(true);
        const fs = await getFileSystem();
        const updated: Vertex = {
          ...vertex,
          items_behavior: {
            child_kind: nextKind,
            display: vertex.items_behavior?.display ?? "grid",
          },
          updated_at: new Date().toISOString(),
        };
        await fs.updateVertex(updated);
        await onVertexUpdated?.(updated);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("itemsTab.errors.update")
        );
      } finally {
        setLabelSaving(false);
      }
    },
    [labelDraft, onVertexUpdated, t, vertex]
  );

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const vertices = await fs.getVertices(vertex.id);
      setItems(vertices.map((v) => ({ vertex: v, workspace })));
    } catch (err) {
      console.error("Failed to load item vertices:", err);
      setError(err instanceof Error ? err.message : t("itemsTab.errors.load"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t, vertex.id, workspace]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems, vertex.id]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, createShortcut)) {
        e.preventDefault();
        fabRef.current?.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createShortcut]);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pt: 6.5,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 2,
          pb: 2,
          pt: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Box
          sx={(theme) => ({
            mb: 1,
            minHeight: `calc(${theme.typography.h6.fontSize} * ${String(
              theme.typography.h6.lineHeight ?? 1.4
            )})`,
            display: "flex",
            alignItems: "center",
            maxWidth: 360,
            cursor: "text",
            "&:hover .items-title-input": editingLabel
              ? undefined
              : {
                  textDecorationColor: "currentColor",
                  textDecorationThickness: "2px",
                },
          })}
          onClick={() => {
            if (!editingLabel) {
              setEditingLabel(true);
            }
          }}
        >
          <EditOutlinedIcon
            fontSize="small"
            sx={{
              mr: 1,
              color: "text.secondary",
              opacity: editingLabel ? 0.6 : 0.9,
            }}
          />
          <InputBase
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => {
              if (editingLabel) {
                void handleLabelCommit();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleLabelCommit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setEditingLabel(false);
                setLabelDraft(label);
              }
            }}
            placeholder={t("vertex.tabs.items")}
            readOnly={!editingLabel}
            disabled={labelSaving}
            className="items-title-input"
            inputRef={labelInputRef}
            inputProps={{
              "aria-label": t("vertex.tabs.items"),
            }}
            sx={(theme) => ({
              flex: 1,
              fontSize: theme.typography.h6.fontSize,
              fontWeight: theme.typography.h6.fontWeight,
              lineHeight: theme.typography.h6.lineHeight,
              color: "text.primary",
              padding: 0,
              "& .MuiInputBase-input": {
                padding: 0,
                cursor: "text",
              },
            })}
          />
        </Box>
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
        {loading ? (
          <Typography color="text.secondary">
            {t("itemsTab.loading")}
          </Typography>
        ) : items.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 240,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography color="text.secondary" align="center">
              {t("itemsTab.empty", { kind: emptyLabel })}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <VertexGrid
              items={items}
              selectedVertexId={null}
              onSelect={(id) => {
                onOpenVertex?.(id);
              }}
              onDeleteVertex={(v) => {
                const match = items.find((c) => c.vertex.id === v.id);
                if (match) setConfirmDelete(match);
              }}
              scrollY
              showWorkspaceLabel={false}
            />
          </Box>
        )}
      </Box>
      <CreateFab
        ref={fabRef}
        onClick={() => {
          setCreateOpen(true);
        }}
        title={t("itemsTab.create")}
        sx={{ position: "absolute", bottom: 20, right: 20 }}
      />
      <CreateVertexDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateError(null);
        }}
        onSubmit={async (data: CreateVertexForm) => {
          try {
            const fs = await getFileSystem();
            const now = new Date().toISOString();
            const newVertex: Vertex = {
              id: crypto.randomUUID(),
              title: data.title,
              asset_directory: "",
              parent_id: vertex.id,
              workspace_id: null,
              default_tab: "items",
              created_at: now,
              updated_at: now,
              tags: [],
              thumbnail_path: data.thumbnail,
            };
            await fs.createVertex(newVertex);
            setCreateOpen(false);
            await loadItems();
          } catch (err) {
            setCreateError(
              err instanceof Error ? err.message : t("itemsTab.errors.create")
            );
          }
        }}
        submitLabel={t("itemsTab.create")}
        title={t("itemsTab.create")}
      />
      {createError && (
        <Typography color="error" variant="body2" sx={{ px: 2, pt: 1 }}>
          {createError}
        </Typography>
      )}

      <DeleteVertexDialog
        open={Boolean(confirmDelete)}
        name={confirmDelete?.vertex.title}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            const fs = await getFileSystem();
            await fs.removeVertex(confirmDelete.vertex);
            setConfirmDelete(null);
            await loadItems();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Failed to delete item."
            );
          }
        }}
        entityLabel="item"
      />
    </Box>
  );
};

const ProjectsOverview: React.FC<ProjectsOverviewProps> = ({
  title = "Projects",
  items,
  workspaces,
  onOpenVertex,
  onDeleteProject,
  onChanged,
}) => {
  const { t } = useTranslation("common");
  const fabRef = React.useRef<CreateFabHandle | null>(null);
  const [fabAnchor, setFabAnchor] = React.useState<HTMLElement | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [selectedWorkspace, setSelectedWorkspace] =
    React.useState<Workspace | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<VertexItem | null>(
    null
  );
  const [workspaceQuery, setWorkspaceQuery] = React.useState("");
  const [activeWorkspaceIndex, setActiveWorkspaceIndex] = React.useState(-1);
  const os = React.useMemo(() => detectOperatingSystem(), []);
  const createShortcut = React.useMemo(
    () => getShortcut("insert", os),
    [os]
  );
  const prevShortcut = React.useMemo(
    () => getShortcut("searchPrevResult", os),
    [os]
  );
  const nextShortcut = React.useMemo(
    () => getShortcut("searchNextResult", os),
    [os]
  );

  const filteredWorkspaces = React.useMemo(() => {
    const q = workspaceQuery.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((ws) => ws.name.toLowerCase().includes(q));
  }, [workspaces, workspaceQuery]);

  React.useEffect(() => {
    if (filteredWorkspaces.length === 0) {
      setActiveWorkspaceIndex(-1);
    } else {
      setActiveWorkspaceIndex(0);
    }
  }, [filteredWorkspaces]);

  const handleCreateProjectInWorkspace = (ws: Workspace) => {
    setSelectedWorkspace(ws);
    setEditorOpen(true);
    setError(null);
    setFabAnchor(null);
  };

  const moveActiveWorkspace = React.useCallback(
    (direction: "prev" | "next") => {
      if (filteredWorkspaces.length === 0) return;
      setActiveWorkspaceIndex((prev) => {
        if (prev === -1) return 0;
        const delta = direction === "next" ? 1 : -1;
        return (
          (prev + delta + filteredWorkspaces.length) % filteredWorkspaces.length
        );
      });
    },
    [filteredWorkspaces.length]
  );

  const handleWorkspaceKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    e
  ) => {
    if (matchesShortcut(e.nativeEvent, prevShortcut)) {
      e.preventDefault();
      moveActiveWorkspace("prev");
      return;
    }
    if (matchesShortcut(e.nativeEvent, nextShortcut)) {
      e.preventDefault();
      moveActiveWorkspace("next");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredWorkspaces[activeWorkspaceIndex];
      if (target) {
        handleCreateProjectInWorkspace(target);
      }
    }
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, createShortcut)) {
        e.preventDefault();
        const buttonEl = fabRef.current?.button;
        setFabAnchor(buttonEl ?? document.body);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createShortcut]);

  const handleCreate = async (data: CreateVertexForm) => {
    if (!selectedWorkspace) {
      setError(t("projects.errors.selectWorkspace"));
      return;
    }
    try {
      const fs = await getFileSystem();
      const now = new Date().toISOString();
      const vertex: Vertex = {
        id: crypto.randomUUID(),
        title: data.title,
        asset_directory: "",
        parent_id: null,
        workspace_id: selectedWorkspace.id,
        default_tab: "items",
        created_at: now,
        updated_at: now,
        tags: [],
        thumbnail_path: data.thumbnail,
      };
      await fs.createVertex(vertex);
      await onChanged();
      setEditorOpen(false);
      setSelectedWorkspace(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("projects.errors.create")
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
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Box sx={{ px: 2, pb: 2, pt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {title}
        </Typography>

        {items.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography color="text.secondary" align="center">
              {t("projects.empty")}
            </Typography>
          </Box>
        ) : (
          <VertexGrid
            items={items}
            selectedVertexId={null}
            onSelect={(id) => onOpenVertex(id)}
            onDeleteVertex={(v) => {
              const match = items.find((it) => it.vertex.id === v.id);
              if (match) setConfirmDelete(match);
            }}
          />
        )}
      </Box>

      <CreateFab
        ref={fabRef}
        onClick={(e) => setFabAnchor(e.currentTarget)}
        title={t("projects.create")}
        sx={{ position: "absolute", bottom: 20, right: 20 }}
      />

      <CreateVertexDialog
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setSelectedWorkspace(null);
          setError(null);
        }}
        onSubmit={handleCreate}
        workspaceLabel={selectedWorkspace?.name}
        submitLabel={t("projects.create")}
        title={t("projects.create")}
      />
      {error && (
        <Typography color="error" variant="body2" sx={{ px: 2, pt: 1 }}>
          {error}
        </Typography>
      )}

      <DeleteVertexDialog
        open={Boolean(confirmDelete)}
        name={confirmDelete?.vertex.title}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) onDeleteProject(confirmDelete.vertex.id);
          setConfirmDelete(null);
        }}
        entityLabel={t("projects.entityLabel")}
      />
      <Popover
        open={Boolean(fabAnchor)}
        anchorEl={fabAnchor}
        onClose={() => setFabAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 340,
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ p: 1.25 }}>
          <Typography sx={{ fontWeight: 900, mb: 1 }}>
            {t("projects.addToWorkspace")}
          </Typography>

          <TextField
            size="small"
            fullWidth
            value={workspaceQuery}
            onChange={(e) => setWorkspaceQuery(e.target.value)}
            onKeyDown={handleWorkspaceKeyDown}
            placeholder={t("projects.searchPlaceholder")}
            autoFocus
          />
        </Box>

        <Divider />

        <Box sx={{ maxHeight: 320, overflowY: "auto" }}>
          <List dense disablePadding>
            {filteredWorkspaces.length === 0 ? (
              <Box sx={{ p: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {t("projects.noWorkspaces")}
                </Typography>
              </Box>
            ) : (
              filteredWorkspaces.map((ws) => (
                <ListItemButton
                  key={ws.id}
                  onClick={() => handleCreateProjectInWorkspace(ws)}
                  selected={ws.id === filteredWorkspaces[activeWorkspaceIndex]?.id}
                  onMouseEnter={() =>
                    setActiveWorkspaceIndex(
                      filteredWorkspaces.findIndex((entry) => entry.id === ws.id)
                    )
                  }
                >
                  <ListItemText
                    primary={ws.name}
                    secondary={ws.path}
                    slotProps={{ secondary: { noWrap: true } }}
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Box>
      </Popover>
    </Box>
  );
};

const DetachedOverview: React.FC<DetachedOverviewProps> = ({
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

export const VertexOverviewTab: React.FC<VertexOverviewTabProps> = (props) => {
  if (props.variant === "items") {
    return <ItemsOverview {...props} />;
  }
  if (props.variant === "projects") {
    return <ProjectsOverview {...props} />;
  }
  return <DetachedOverview {...props} />;
};
