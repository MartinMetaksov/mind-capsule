import { Loading } from "@/common/loading/Loading";
import { Logo } from "@/common/logo/Logo";
import { APP_NAME, APP_NAME_TECHNICAL } from "@/constants/appConstants";
import { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";

type WorkspaceSetupProps = {
  workspaces?: Workspace[];
  onChanged?: () => Promise<void> | void;
};

export const WorkspaceSetup: React.FC<WorkspaceSetupProps> = ({
  workspaces = [],
  onChanged,
}) => {
  const { t } = useTranslation("common");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
        name: t("workspaceSetup.newWorkspaceName"),
        path: selectedDir,
        purpose: t("workspaceSetup.selectedPurpose"),
        created_at: now,
        updated_at: now,
        tags: [],
      };

      await fs.createWorkspace(workspace);
      await onChanged?.();
    } catch (err) {
      console.error("Pick workspace failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to select workspace.",
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

      const defaultPath = `memory://.${APP_NAME_TECHNICAL}Workspace`;
      const now = new Date().toISOString();

      const workspace: Workspace = {
        id: crypto.randomUUID(),
        name: t("workspaceSetup.defaultWorkspaceName"),
        path: defaultPath,
        purpose: t("workspaceSetup.defaultPurpose", { app: APP_NAME }),
        created_at: now,
        updated_at: now,
        tags: [],
      };

      await fs.createWorkspace(workspace);
      await onChanged?.();
    } catch (err) {
      console.error("Create default workspace failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create workspace.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", m: "auto", mt: 2 }}>
      <Stack spacing={2} sx={{ maxWidth: 420 }}>
        <Logo width={180} />

        <Typography variant="h5">{t("workspaceSetup.welcome", { app: APP_NAME })}</Typography>

        <Typography color="text.secondary">
          {t("workspaceSetup.description", { app: APP_NAME })}
        </Typography>

        <Typography color="text.secondary">
          {t("workspaceSetup.requires")}{" "}
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
          onClick={handlePickWorkspace}
          disabled={loading}
        >
          {loading ? t("workspaceSetup.settingUp") : t("workspaceSetup.chooseFolder")}
        </Button>

        <Box visibility={loading ? "hidden" : "visible"}>
          <Typography color="text.secondary">
            {t("workspaceSetup.quickStart", { app: APP_NAME })}{" "}
            <Tooltip
              title={
                <Typography variant="body2">
                  {t("workspaceSetup.quickStartTooltip", { technical: APP_NAME_TECHNICAL })}
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
                sx={{ textDecoration: "underline dotted", cursor: "help" }}
              >
                {t("workspaceSetup.default")}
              </Box>
            </Tooltip>{" "}
            {t("workspaceSetup.workspaceLower")}
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={createDefaultWorkspace}
          disabled={loading}
        >
          {t("workspaceSetup.createDefault")}
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

        {workspaces.length > 0 && (
          <>
            <Typography variant="subtitle1">{t("workspaces.title")}</Typography>
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
