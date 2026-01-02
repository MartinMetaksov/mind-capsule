import { Loading } from "@/common/loading/Loading";
import { Logo } from "@/common/logo/Logo";
import { APP_NAME, APP_NAME_TECHNICAL } from "@/constants/appConstants";
import { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import React from "react";

const normalize_tags = (tags: string[]): string[] =>
  Array.from(
    new Set(tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0))
  );

export const VertexOverview: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);

  const refreshWorkspaces = React.useCallback(async () => {
    const fs = await getFileSystem();
    const list = await fs.getWorkspaces();
    setWorkspaces(list);
  }, []);

  React.useEffect(() => {
    // Load existing workspaces on mount (works in web mock too)
    refreshWorkspaces().catch((err) => {
      console.error("Failed to load workspaces:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load workspaces."
      );
    });
  }, [refreshWorkspaces]);

  const handlePickWorkspace = async () => {
    setLoading(true);
    setError(null);

    try {
      const fs = await getFileSystem();

      const selectedDir = await fs.selectWorkspaceDirectory();
      if (!selectedDir) return;

      const now = new Date().toISOString();

      const workspace: Workspace = {
        id: crypto.randomUUID(),
        name: "New workspace",
        path: selectedDir,
        purpose: "Selected workspace directory",
        created_at: now,
        updated_at: now,
        tags: [],
        root_vertex_ids: [],
      };

      await fs.createWorkspace(workspace);
      setWorkspaces(await fs.getWorkspaces());
    } catch (err) {
      console.error("Pick workspace failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to select workspace."
      );
    } finally {
      setLoading(false);
    }
  };

  const createDefaultWorkspace = async () => {
    setLoading(true);
    setError(null);

    try {
      const fs = await getFileSystem();

      // For now we can use a conventional path/uri in web mode.
      // In Tauri mode, you’ll likely want fs to actually create this folder and return its real path.
      const defaultPath = `memory://.${APP_NAME_TECHNICAL}Workspace`;

      const now = new Date().toISOString();

      const workspace: Workspace = {
        id: crypto.randomUUID(),
        name: "Default workspace",
        path: defaultPath,
        purpose: `Created by ${APP_NAME}`,
        created_at: now,
        updated_at: now,
        tags: [],
        root_vertex_ids: [],
      };

      await fs.createWorkspace(workspace);
      setWorkspaces(await fs.getWorkspaces());
    } catch (err) {
      console.error("Create default workspace failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create workspace."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        m: "auto",
        mt: "20px",
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 420 }}>
        <Logo width={180} />

        <Typography variant="h5">Welcome to {APP_NAME}</Typography>

        <Typography color="text.secondary">
          {APP_NAME} helps you capture and organize ideas, story beats, lore,
          inspiration, world-building notes — all in one place.
        </Typography>

        <Typography color="text.secondary">
          {APP_NAME} requires a{" "}
          <Tooltip
            title={
              <Stack spacing={1.5}>
                <Typography variant="body2">
                  A workspace is a folder on your computer where {APP_NAME}
                  stores your projects, notes, and files.
                </Typography>
                <Typography variant="body2">
                  Tip: If you place your workspace in iCloud, Dropbox, or
                  OneDrive, it can sync across your devices automatically.
                </Typography>
              </Stack>
            }
            arrow
            placement="top"
            slotProps={{
              tooltip: {
                sx: {
                  backgroundColor: "background.paper",
                  color: "text.primary",
                  border: "1px solid",
                  borderColor: "divider",
                  fontSize: "0.75rem",
                },
              },
              arrow: {
                sx: { color: "background.paper" },
              },
            }}
          >
            <Box
              component="span"
              sx={{
                textDecoration: "underline dotted",
                cursor: "help",
              }}
            >
              workspace
            </Box>
          </Tooltip>{" "}
          to get started.
        </Typography>

        <Button
          variant="contained"
          onClick={handlePickWorkspace}
          disabled={loading}
        >
          {loading ? "Setting up workspace…" : "Choose workspace folder"}
        </Button>

        <Box visibility={loading ? "hidden" : "visible"}>
          <Typography color="text.secondary">
            Prefer a quick start? {APP_NAME} can create a{" "}
            <Tooltip
              title={
                <Typography variant="body2">
                  Creates a folder named{" "}
                  <code>.{APP_NAME_TECHNICAL}Workspace</code> in your home
                  directory.
                </Typography>
              }
              arrow
              placement="top"
              slotProps={{
                tooltip: {
                  sx: {
                    backgroundColor: "background.paper",
                    color: "text.primary",
                    border: "1px solid",
                    borderColor: "divider",
                    fontSize: "0.75rem",
                  },
                },
                arrow: { sx: { color: "background.paper" } },
              }}
            >
              <Box
                component="span"
                sx={{
                  textDecoration: "underline dotted",
                  cursor: "help",
                }}
              >
                default
              </Box>
            </Tooltip>{" "}
            workspace for you.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={createDefaultWorkspace}
          disabled={loading}
        >
          Create default workspace
        </Button>

        <Typography color="text.secondary">
          You can change your workspace later in Settings.
        </Typography>

        {loading && <Loading />}

        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}

        {workspaces.length > 0 && (
          <>
            <Typography variant="subtitle1">Workspaces</Typography>
            <ul>
              {workspaces.map((w) => (
                <li key={w.id}>{w.name}</li>
              ))}
            </ul>
          </>
        )}
      </Stack>
    </Box>
  );
};
