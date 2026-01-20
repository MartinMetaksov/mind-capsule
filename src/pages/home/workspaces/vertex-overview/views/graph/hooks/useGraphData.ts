import * as React from "react";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import type { VertexItem } from "../../grid/VertexGrid";
import type { GraphData } from "../types";
import { buildGraph } from "../utils/buildGraph";

type UseGraphDataResult = {
  graphData: GraphData | null;
  loading: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  loadGraph: () => Promise<void>;
};

export const useGraphData = (items: VertexItem[]): UseGraphDataResult => {
  const [graphData, setGraphData] = React.useState<GraphData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadGraph = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const [workspaces, vertices] = await Promise.all([
        fs.getWorkspaces(),
        fs.getAllVertices(),
      ]);
      setGraphData(buildGraph(workspaces, vertices));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load graph.");
      setGraphData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const itemsKey = React.useMemo(
    () => items.map((item) => item.vertex.id).join("|"),
    [items]
  );

  React.useEffect(() => {
    loadGraph();
  }, [itemsKey, loadGraph]);

  return { graphData, loading, error, setError, loadGraph };
};
