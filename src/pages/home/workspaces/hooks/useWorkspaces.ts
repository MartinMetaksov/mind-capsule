import { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import React from "react";

export const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refreshWorkspaces = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const fs = await getFileSystem();
      const list = await fs.getWorkspaces();
      setWorkspaces(list);
    } catch (err) {
      console.error("Failed to load workspaces:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load workspaces.",
      );
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  return { workspaces, loading, error, refreshWorkspaces };
};
