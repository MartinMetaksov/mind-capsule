import { Loading } from "@/common/loading/Loading";
import { Logo } from "@/common/logo/Logo";
import { APP_NAME } from "@/constants/appConstants";
import { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  WorkspaceDialog,
  WorkspaceFormData,
} from "../components/workspace-dialogs/WorkspaceDialogs";

type WorkspaceSetupProps = {
  onChanged?: () => Promise<void> | void;
};

export const WorkspaceSetup: React.FC<WorkspaceSetupProps> = ({
  onChanged,
}) => {
  const { t } = useTranslation("common");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);

  const handlePickPath = async () => {
    try {
      const fs = await getFileSystem();
      const selected = await fs.selectWorkspaceDirectory();
      return selected;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("workspaces.errors.selectDirectory")
      );
      return null;
    }
  };

  const handleCreateWorkspace = async (data: WorkspaceFormData) => {
    setLoading(true);
    setError(null);

    try {
      const fs = await getFileSystem();
      const now = new Date().toISOString();
      const workspace: Workspace = {
        id: crypto.randomUUID(),
        name: data.name,
        path: data.path,
        created_at: now,
        updated_at: now,
        tags: [],
      };

      await fs.createWorkspace(workspace);
      await onChanged?.();
      setEditorOpen(false);
    } catch (err) {
      console.error("Create workspace failed:", err);
      setError(
        err instanceof Error ? err.message : t("workspaces.errors.save")
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
        alignItems: "flex-start",
        width: "100%",
        height: "100%",
        overflow: "auto",
        py: 6,
        px: 2,
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 420 }}>
        <Logo width={180} />

        <Typography variant="h5">
          {t("workspaceSetup.welcome", { app: APP_NAME })}
        </Typography>

        <Typography color="text.secondary">
          {t("workspaceSetup.description", { app: APP_NAME })}
        </Typography>

        <Typography color="text.secondary">
          {t("workspaceSetup.requires", { app: APP_NAME })}{" "}
          <Tooltip
            title={
              <Stack spacing={1.5}>
                <Typography variant="body2">
                  {t("workspaceSetup.tooltip.line1", { app: APP_NAME })}
                </Typography>
                <Typography variant="body2">
                  {t("workspaceSetup.tooltip.line2")}
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
              arrow: { sx: { color: "background.paper" } },
            }}
          >
            <Box
              component="span"
              sx={{ textDecoration: "underline dotted", cursor: "help" }}
            >
              {t("workspaceSetup.workspace")}
            </Box>
          </Tooltip>{" "}
          {t("workspaceSetup.toGetStarted")}
        </Typography>

        <Button
          variant="contained"
          onClick={() => setEditorOpen(true)}
          disabled={loading}
        >
          {loading
            ? t("workspaceSetup.settingUp")
            : t("workspaceSetup.create")}
        </Button>

        <Typography color="text.secondary">
          {t("workspaceSetup.changeLater")}
        </Typography>

        {loading && <Loading />}

        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </Stack>

      <WorkspaceDialog
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setError(null);
        }}
        onSubmit={handleCreateWorkspace}
        onPickPath={handlePickPath}
        error={error}
      />
    </Box>
  );
};
