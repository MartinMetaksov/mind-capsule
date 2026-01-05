import * as React from "react";
import { Box, Typography } from "@mui/material";

import { VertexGrid, VertexItem } from "../VertexGrid";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";

type ChildrenTabProps = {
  label: string;
  vertex: Vertex;
  workspace: Workspace;
  onOpenVertex?: (vertexId: string) => void;
};

export const ChildrenTab: React.FC<ChildrenTabProps> = ({
  label,
  vertex,
  workspace,
  onOpenVertex,
}) => {
  const [children, setChildren] = React.useState<VertexItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadChildren = React.useCallback(async () => {
    const ids = vertex.children_ids ?? [];
    if (ids.length === 0) {
      setChildren([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const fetched = await Promise.all(ids.map((id) => fs.getVertex(id)));
      const vertices = fetched.filter(Boolean) as Vertex[];
      setChildren(vertices.map((v) => ({ vertex: v, workspace })));
    } catch (err) {
      console.error("Failed to load child vertices:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load child vertices.",
      );
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [vertex.children_ids, workspace]);

  React.useEffect(() => {
    loadChildren();
  }, [loadChildren, vertex.id]);

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}
    >
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        {label}
      </Typography>
      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}
      {loading ? (
        <Typography color="text.secondary">Loading children…</Typography>
      ) : children.length === 0 ? (
        <Typography color="text.secondary">
          No child vertices yet. Add one to see it here.
        </Typography>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <VertexGrid
            items={children}
            selectedVertexId={null}
            onSelect={(id) => {
              onOpenVertex?.(id);
            }}
            onDeselect={() => {}}
            onOpenChildren={() => {}}
            onOpenReferences={() => {}}
            scrollY
            showWorkspaceLabel={false}
          />
        </Box>
      )}
    </Box>
  );
};
