import { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import React from "react";
import { useTranslation } from "react-i18next";

export const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { t } = useTranslation("common");

  const refreshWorkspaces = React.useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const fs = await getFileSystem();
      await fs.pruneMissingWorkspaces();
      const list = await fs.getWorkspaces();
      setWorkspaces(list);
    } catch (err) {
      console.error("Failed to load workspaces:", err);
      setError(err instanceof Error ? err.message : t("errors.loadWorkspaces"));
      setWorkspaces([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [t]);

  React.useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      refreshWorkspaces(true);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [refreshWorkspaces]);

  return { workspaces, loading, error, refreshWorkspaces, setWorkspaces };
};
