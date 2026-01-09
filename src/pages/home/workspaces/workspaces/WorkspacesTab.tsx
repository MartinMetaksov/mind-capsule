import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";

import type { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { CreateFab, type CreateFabHandle } from "../components/CreateFab";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";

type WorkspacesTabProps = {
  workspaces: Workspace[];
  onChanged: () => Promise<void>;
};

type EditingWorkspace = Partial<Workspace> & { id?: string };

export const WorkspacesTab: React.FC<WorkspacesTabProps> = ({
  workspaces,
  onChanged,
}) => {
  const fabRef = React.useRef<CreateFabHandle | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EditingWorkspace>({});
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Workspace | null>(
    null
  );
  const os = React.useMemo(() => detectOperatingSystem(), []);
  const createShortcut = React.useMemo(
    () => getShortcut("createVertex", os),
    [os]
  );

  const openCreate = () => {
    setEditing({ name: "", path: "", purpose: "" });
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
      if (!selected) return;
      setEditing((prev) => ({ ...prev, path: selected }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to select directory."
      );
    }
  };

  const saveWorkspace = async () => {
    try {
      setError(null);
      const fs = await getFileSystem();
      if (!editing.name || !editing.path) {
        setError("Name and path are required.");
        return;
      }

      const now = new Date().toISOString();
      if (editing.id) {
        const ws: Workspace = {
          ...(editing as Workspace),
          updated_at: now,
        };
        await fs.updateWorkspace(ws);
      } else {
        const ws: Workspace = {
          id: crypto.randomUUID(),
          name: editing.name,
          path: editing.path,
          purpose: editing.purpose ?? "",
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
        err instanceof Error ? err.message : "Failed to save workspace."
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
        err instanceof Error ? err.message : "Failed to delete workspace."
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
            Workspaces
          </Typography>
          <Typography color="text.secondary">
            Create, rename, change paths, or remove workspaces.
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
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  onClick={() => openEdit(ws)}
                  aria-label="edit workspace"
                >
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={() => setConfirmDelete(ws)}
                  aria-label="delete workspace"
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Paper>
        ))}
      </Box>

      <Dialog open={editorOpen} onClose={closeEditor} fullWidth maxWidth="sm">
        <DialogTitle>
          {editing.id ? "Edit workspace" : "Create workspace"}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              pt: 2,
              pb: 1,
            }}
          >
            <TextField
              label="Name"
              fullWidth
              value={editing.name ?? ""}
              onChange={(e) =>
                setEditing((prev) => ({ ...prev, name: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Purpose"
              fullWidth
              value={editing.purpose ?? ""}
              onChange={(e) =>
                setEditing((prev) => ({ ...prev, purpose: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label="Path"
                fullWidth
                value={editing.path ?? ""}
                onChange={(e) =>
                  setEditing((prev) => ({ ...prev, path: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
              <Tooltip title="Select directory">
                <IconButton onClick={handlePickPath}>
                  <FolderOpenRoundedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditor}>Cancel</Button>
          <Button variant="contained" onClick={saveWorkspace}>
            {editing.id ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete workspace</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{confirmDelete?.name ?? "this workspace"}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={removeWorkspace}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <CreateFab
        ref={fabRef}
        onClick={openCreate}
        title="Create workspace"
        sx={{ position: "absolute", bottom: 20, right: 20 }}
      />
    </Box>
  );
};
