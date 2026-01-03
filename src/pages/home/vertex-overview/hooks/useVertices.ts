import React from "react";
import { Id } from "@/core/common/id";
import { Vertex } from "@/core/vertex";
import { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";

export type VerticesMap = Record<Id, Vertex[]>;

export const useVertices = (workspaces: Workspace[] | undefined) => {
  const [verticesByWorkspace, setVerticesByWorkspace] =
    React.useState<VerticesMap>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadVertices = React.useCallback(async () => {
    if (!workspaces || workspaces.length === 0) {
      setVerticesByWorkspace({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fs = await getFileSystem();
      const next: VerticesMap = {};

      for (const ws of workspaces) {
        const rootIds = ws.root_vertex_ids ?? [];

        if (rootIds.length === 0) {
          next[ws.id] = [];
          continue;
        }

        const roots = await Promise.all(rootIds.map((id) => fs.getVertex(id)));

        // filter out nulls (in case ids reference missing vertices)
        next[ws.id] = roots.filter((v): v is Vertex => Boolean(v));
      }

      setVerticesByWorkspace(next);
    } catch (err) {
      console.error("Failed to load vertices:", err);
      setError(err instanceof Error ? err.message : "Failed to load vertices.");
      setVerticesByWorkspace({});
    } finally {
      setLoading(false);
    }
  }, [workspaces]);

  React.useEffect(() => {
    loadVertices();
  }, [loadVertices]);

  return { verticesByWorkspace, loading, error, reloadVertices: loadVertices };
};
