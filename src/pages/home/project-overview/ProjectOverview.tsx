import { Loading } from "@/common/loading/Loading";
import { Logo } from "@/common/logo/Logo";
// import { pickWorkspaceFolder } from "@/integrations/fileSystem/workspacePicker";
// import { WorkspaceService } from "@/integrations/fileSystem/workspaceService";
import { Project } from "@/models/project";
import {
  Box,
  Button,
  // CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import React from "react";

export const ProjectOverview: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);

  // Example usage of the integrations
  // const handlePickWorkspace = async () => {
  //   setLoading(true);
  //   setError(null);

  //   try {
  //     const ws = await pickWorkspaceFolder();

  //     if (!ws) {
  //       setLoading(false);
  //       return;
  //     }

  //     // Create an example project
  //     const created = await WorkspaceService.createProject("My first project");
  //     console.log("Created project:", created);

  //     // Load all projects
  //     const list = await WorkspaceService.listProjects();
  //     console.log("Project list:", list);

  //     setProjects(list);
  //   } catch (err) {
  //     console.error(err);
  //     setError("Failed to initialize workspace.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handlePickWorkspace = async () => {
    // TODO: implement later
  };
  const createDefaultWorkspace = async () => {
    // TODO: implement later
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

        <Typography variant="h5">Welcome to Story Master</Typography>

        <Typography color="text.secondary">
          Story Master helps you capture and organize game ideas, story beats,
          lore, inspiration, and world-building notes — all in one place.
        </Typography>

        <Typography color="text.secondary">
          Story Master needs a{" "}
          <Tooltip
            title={
              <Stack spacing={1.5}>
                <Typography variant="body2">
                  A workspace is a folder on your computer where Story Master
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
                sx: {
                  color: "background.paper",
                },
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
            Prefer a quick start? Story Master can create a{" "}
            <Tooltip
              title={
                <Typography variant="body2">
                  Creates a folder named <code>.StoryMasterWorkspace</code> in
                  your home directory.
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
                arrow: {
                  sx: {
                    color: "background.paper",
                  },
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

        {projects.length > 0 && (
          <>
            <Typography variant="subtitle1">Projects</Typography>
            <ul>
              {projects.map((p) => (
                <li key={p.id}>{p.title}</li>
              ))}
            </ul>
          </>
        )}
      </Stack>
    </Box>
  );
};
