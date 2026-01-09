import React from "react";
import { Id } from "@/core/common/id";
import { Vertex } from "@/core/vertex";
import { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";

export type WorkspaceByVertexId = Record<Id, Workspace>;

export const useVertices = (workspaces: Workspace[] | undefined) => {
  const [vertices, setVertices] = React.useState<Vertex[]>([]);
  const [workspaceByVertexId, setWorkspaceByVertexId] =
    React.useState<WorkspaceByVertexId>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { t } = useTranslation("common");

  const loadVertices = React.useCallback(async () => {
    if (!workspaces || workspaces.length === 0) {
      setVertices([]);
      setWorkspaceByVertexId({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fs = await getFileSystem();

      const nextVertices: Vertex[] = [];
      const nextWorkspaceByVertexId: WorkspaceByVertexId = {};

      for (const ws of workspaces) {
        const roots = await fs.getWorkspaceRootVertices(ws.id);
        for (const v of roots) {
          nextVertices.push(v);
          nextWorkspaceByVertexId[v.id] = ws;
        }
      }

      setVertices(nextVertices);
      setWorkspaceByVertexId(nextWorkspaceByVertexId);
    } catch (err) {
      console.error("Failed to load vertices:", err);
      setError(err instanceof Error ? err.message : t("errors.loadVertices"));
      setVertices([]);
      setWorkspaceByVertexId({});
    } finally {
      setLoading(false);
    }
  }, [workspaces, t]);

  React.useEffect(() => {
    loadVertices();
  }, [loadVertices]);

  return {
    vertices,
    workspaceByVertexId,
    loading,
    error,
    reloadVertices: loadVertices,
  };
};
