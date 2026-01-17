import * as React from "react";
import { Box, Typography } from "@mui/material";

import { VertexGrid, VertexItem } from "../vertex-grid/VertexGrid";
import {
  CreateFab,
  type CreateFabHandle,
} from "../../components/create-fab/CreateFab";
import {
  CreateVertexDialog,
  DeleteVertexDialog,
  CreateVertexForm,
} from "../../components/vertex-dialogs/VertexDialogs";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { useTranslation } from "react-i18next";

type ItemsTabProps = {
  label: string;
  vertex: Vertex;
  workspace: Workspace;
  onOpenVertex?: (vertexId: string) => void;
};

export const ItemsTab: React.FC<ItemsTabProps> = ({
  label,
  vertex,
  workspace,
  onOpenVertex,
}) => {
  const { t } = useTranslation("common");
  const fabRef = React.useRef<CreateFabHandle | null>(null);
  const os = React.useMemo(() => detectOperatingSystem(), []);
  const createShortcut = React.useMemo(
    () => getShortcut("insert", os),
    [os]
  );
  const emptyLabel = React.useMemo(() => {
    const kind = vertex.items_behavior?.child_kind?.trim();
    if (!kind) return "items";
    return kind;
  }, [vertex.items_behavior?.child_kind]);

  const [items, setItems] = React.useState<VertexItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<VertexItem | null>(
    null
  );
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const vertices = await fs.getVertices(vertex.id);
      setItems(vertices.map((v) => ({ vertex: v, workspace })));
    } catch (err) {
      console.error("Failed to load item vertices:", err);
      setError(
        err instanceof Error ? err.message : t("itemsTab.errors.load")
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t, vertex.id, workspace]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems, vertex.id]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, createShortcut)) {
        e.preventDefault();
        fabRef.current?.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createShortcut]);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pt: 6.5,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 2,
          pb: 2,
          pt: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
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
          <Typography color="text.secondary">
            {t("itemsTab.loading")}
          </Typography>
        ) : items.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 240,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography color="text.secondary" align="center">
              {t("itemsTab.empty", { kind: emptyLabel })}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <VertexGrid
              items={items}
              selectedVertexId={null}
              onSelect={(id) => {
                onOpenVertex?.(id);
              }}
              onDeleteVertex={(v) => {
                const match = items.find((c) => c.vertex.id === v.id);
                if (match) setConfirmDelete(match);
              }}
              scrollY
              showWorkspaceLabel={false}
            />
          </Box>
        )}
      </Box>
      <CreateFab
        ref={fabRef}
        onClick={() => {
          setCreateOpen(true);
        }}
        title={t("itemsTab.create")}
        sx={{ position: "absolute", bottom: 20, right: 20 }}
      />
      <CreateVertexDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateError(null);
        }}
        onSubmit={async (data: CreateVertexForm) => {
          try {
            const fs = await getFileSystem();
            const now = new Date().toISOString();
            const newVertex: Vertex = {
              id: crypto.randomUUID(),
              title: data.title,
              asset_directory: "",
              parent_id: vertex.id,
              workspace_id: null,
              default_tab: "items",
              created_at: now,
              updated_at: now,
              tags: [],
              thumbnail_path: data.thumbnail,
            };
            await fs.createVertex(newVertex);
            setCreateOpen(false);
            await loadItems();
          } catch (err) {
            setCreateError(
              err instanceof Error
                ? err.message
                : t("itemsTab.errors.create")
            );
          }
        }}
        submitLabel={t("itemsTab.create")}
        title={t("itemsTab.create")}
      />
      {createError && (
        <Typography color="error" variant="body2" sx={{ px: 2, pt: 1 }}>
          {createError}
        </Typography>
      )}

      <DeleteVertexDialog
        open={Boolean(confirmDelete)}
        name={confirmDelete?.vertex.title}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            const fs = await getFileSystem();
            await fs.removeVertex(confirmDelete.vertex);
            setConfirmDelete(null);
            await loadItems();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Failed to delete item."
            );
          }
        }}
        entityLabel="item"
      />
    </Box>
  );
};
