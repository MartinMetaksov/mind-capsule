import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";

import type { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { CreateFab, type CreateFabHandle } from "../components/create-fab/CreateFab";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { useTranslation } from "react-i18next";
import {
  WorkspaceDialog,
  DeleteWorkspaceDialog,
  WorkspaceFormData,
} from "../components/workspace-dialogs/WorkspaceDialogs";

type WorkspacesTabProps = {
  workspaces: Workspace[];
  onChanged: () => Promise<void>;
};

type EditingWorkspace = Partial<Workspace> & { id?: string };

export const WorkspacesTab: React.FC<WorkspacesTabProps> = ({
  workspaces,
  onChanged,
}) => {
  const { t } = useTranslation("common");
  const fabRef = React.useRef<CreateFabHandle | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EditingWorkspace>({});
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Workspace | null>(
    null
  );
  const os = React.useMemo(() => detectOperatingSystem(), []);
  const createShortcut = React.useMemo(
    () => getShortcut("insert", os),
    [os]
  );

  const openCreate = () => {
    setEditing({ name: "", path: "" });
    setEditorOpen(true);
    setError(null);
  };

  const openEdit = (ws: Workspace) => {
    setEditing(ws);
    setEditorOpen(true);
    setError(null);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditing({});
    setError(null);
  };

  const handlePickPath = async () => {
    try {
      const fs = await getFileSystem();
      const selected = await fs.selectWorkspaceDirectory();
      return selected;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("workspaces.errors.selectDirectory")
      );
      return null;
    }
  };

  const saveWorkspace = async (data: WorkspaceFormData) => {
    try {
      setError(null);
      const fs = await getFileSystem();
      const now = new Date().toISOString();
      if (data.id) {
        const ws: Workspace = {
          ...(data as Workspace),
          updated_at: now,
          created_at: editing.created_at ?? now,
          tags: editing.tags ?? [],
        };
        await fs.updateWorkspace(ws);
      } else {
        const ws: Workspace = {
          id: crypto.randomUUID(),
          name: data.name,
          path: data.path,
          created_at: now,
          updated_at: now,
          tags: [],
        };
        await fs.createWorkspace(ws);
      }

      await onChanged();
      closeEditor();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("workspaces.errors.save")
      );
    }
  };

  const removeWorkspace = async () => {
    if (!confirmDelete) return;
    try {
      const fs = await getFileSystem();
      await fs.removeWorkspace(confirmDelete.id);
      setConfirmDelete(null);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("workspaces.errors.delete")
      );
    }
  };

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
        overflow: "auto",
        p: 2,
        pb: 8,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5, pr: 1 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {t("workspaces.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("workspaces.subtitle")}
          </Typography>
        </Box>
        <Box sx={{ height: 40, width: 40 }} />
      </Stack>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {workspaces.map((ws) => (
          <Paper
            key={ws.id}
            variant="outlined"
            sx={{
              p: 1.5,
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              alignItems: "center",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }}>{ws.name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {ws.path}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title={t("workspaces.actions.edit")}>
                <IconButton
                  size="small"
                  onClick={() => openEdit(ws)}
                  aria-label={t("workspaces.actions.edit")}
                >
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("workspaces.actions.delete")}>
                <IconButton
                  size="small"
                  onClick={() => setConfirmDelete(ws)}
                  aria-label={t("workspaces.actions.delete")}
                >
                  <LinkOffRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Paper>
        ))}
      </Box>

      <WorkspaceDialog
        open={editorOpen}
        titleOverride={
          editing.id ? undefined : t("workspaces.createTitle")
        }
        submitLabelOverride={
          editing.id ? undefined : t("workspaces.actions.associate")
        }
        initial={
          editing.name && editing.path
            ? {
              id: editing.id,
              name: editing.name,
              path: editing.path,
            }
            : undefined
        }
        error={error}
        onClose={closeEditor}
        onSubmit={saveWorkspace}
        onPickPath={handlePickPath}
      />

      <DeleteWorkspaceDialog
        open={Boolean(confirmDelete)}
        name={confirmDelete?.name}
        titleOverride={t("workspaces.deleteTitle")}
        confirmLabelOverride={t("workspaces.actions.delete")}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={removeWorkspace}
      />

      <CreateFab
        ref={fabRef}
        onClick={openCreate}
        title={t("workspaces.createTitle")}
        sx={{ position: "absolute", bottom: 20, right: 20 }}
      />
    </Box>
  );
};
