import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  Link,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import type {
  ItemsBehavior,
  ItemsDisplayHint,
  VertexTabId,
} from "@/core/vertex";
import { ThumbnailPicker } from "../../components/vertex-dialogs/VertexDialogs";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";

type PropertiesTabProps = {
  vertex: Vertex;
  workspace: Workspace;
  hasItems: boolean;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
  onSelectTab: (tab: VertexTabId) => void;
};

export const PropertiesTab: React.FC<PropertiesTabProps> = ({
  vertex,
  workspace: _workspace,
  hasItems: _hasItems,
  onVertexUpdated,
  onSelectTab,
}) => {
  const { t } = useTranslation("common");
  const [title, setTitle] = React.useState(vertex.title);
  const [defaultTab, setDefaultTab] = React.useState<VertexTabId>(
    vertex.default_tab ?? "items"
  );
  const [itemsBehavior, setItemsBehavior] = React.useState<ItemsBehavior>({
    child_kind: vertex.items_behavior?.child_kind ?? "generic",
    display: vertex.items_behavior?.display ?? "grid",
  });
  const [thumbnail, setThumbnail] = React.useState<string | undefined>(
    vertex.thumbnail_path
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLeaf, setIsLeaf] = React.useState<boolean>(Boolean(vertex.is_leaf));
  const assetDirectory = vertex.asset_directory;

  React.useEffect(() => {
    setTitle(vertex.title);
    setDefaultTab(vertex.default_tab ?? "items");
    setItemsBehavior({
      child_kind: vertex.items_behavior?.child_kind ?? "generic",
      display: vertex.items_behavior?.display ?? "grid",
    });
    setThumbnail(vertex.thumbnail_path);
    setError(null);
    setIsLeaf(Boolean(vertex.is_leaf));
  }, [vertex]);

  const handleOpenAssetDirectory = React.useCallback(async () => {
    if (!assetDirectory) return;
    try {
      const { isTauri, invoke } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        await invoke("fs_open_path", { path: assetDirectory });
        return;
      }
      window.open(encodeURI(`file://${assetDirectory}`), "_blank", "noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open folder.");
    }
  }, [assetDirectory]);

  const tabOptions: { value: VertexTabId; label: string }[] = [
    { value: "items", label: t("vertex.tabs.items") },
    { value: "properties", label: t("vertex.tabs.properties") },
    { value: "tags", label: t("vertex.tabs.tags") },
    { value: "notes", label: t("vertex.tabs.notes") },
    { value: "images", label: t("vertex.tabs.images") },
    { value: "urls", label: t("vertex.tabs.links") },
  ];

  const itemsDisplayOptions: { value: ItemsDisplayHint; label: string }[] = [
    { value: "grid", label: t("propertiesTab.itemsDisplay.grid") },
    { value: "list", label: t("propertiesTab.itemsDisplay.list") },
    { value: "graph", label: t("propertiesTab.itemsDisplay.graph") },
  ];

  const isDirty =
    title !== vertex.title ||
    defaultTab !== (vertex.default_tab ?? "items") ||
    itemsBehavior.child_kind !==
      (vertex.items_behavior?.child_kind ?? "generic") ||
    itemsBehavior.display !== (vertex.items_behavior?.display ?? "grid") ||
    thumbnail !== vertex.thumbnail_path ||
    isLeaf !== Boolean(vertex.is_leaf);

  const handleSave = async () => {
    if (!title.trim()) {
      setError(t("propertiesTab.errors.titleRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const updated: Vertex = {
        ...vertex,
        title: title.trim(),
        default_tab: defaultTab,
        items_behavior: itemsBehavior,
        thumbnail_path: thumbnail,
        updated_at: new Date().toISOString(),
        is_leaf: isLeaf,
      };
      await fs.updateVertex(updated);
      await onVertexUpdated?.(updated);
      onSelectTab(
        updated.is_leaf
          ? ("properties" as VertexTabId)
          : (updated.default_tab ?? "items")
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("propertiesTab.errors.save")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        maxWidth: 760,
        mx: "auto",
        width: "100%",
      }}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {t("vertex.tabs.properties")}
        </Typography>
        <Typography color="text.secondary">
          {t("propertiesTab.subtitle")}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {t("propertiesTab.assetDirectoryLabel")}
          </Typography>
          {assetDirectory ? (
            <Link
              component="button"
              type="button"
              variant="body2"
              underline="hover"
              onClick={handleOpenAssetDirectory}
              sx={{
                display: "block",
                fontFamily: "monospace",
                wordBreak: "break-all",
                textAlign: "left",
              }}
            >
              {assetDirectory}
            </Link>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
            >
              —
            </Typography>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Divider />

      <Stack spacing={2}>
        <TextField
          label={t("vertexDialog.fields.title")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <TextField
          label={t("propertiesTab.defaultTab")}
          select
          value={defaultTab}
          onChange={(e) => setDefaultTab(e.target.value as VertexTabId)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        >
          {tabOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label={t("propertiesTab.leaf.label")}
            select
            value={isLeaf ? "yes" : "no"}
            onChange={(e) => setIsLeaf(e.target.value === "yes")}
            fullWidth
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                endAdornment: (
                  <Tooltip title={t("propertiesTab.leaf.tooltip")}>
                    <Typography component="span" sx={{ ml: 1, color: "text.secondary" }}>
                      ?
                    </Typography>
                  </Tooltip>
                ),
              },
            }}
          >
            <MenuItem value="no">{t("propertiesTab.leaf.no")}</MenuItem>
            <MenuItem value="yes">{t("propertiesTab.leaf.yes")}</MenuItem>
          </TextField>

          <TextField
            label={t("propertiesTab.items.display")}
            select
            value={itemsBehavior.display}
            onChange={(e) =>
              setItemsBehavior((prev) => ({
                ...prev,
                display: e.target.value as ItemsDisplayHint,
              }))
            }
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          >
            {itemsDisplayOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <ThumbnailPicker
          value={thumbnail}
          onChange={setThumbnail}
          height={150}
        />
      </Stack>

      <Box sx={{ display: "flex", gap: 1, pt: 1 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? t("propertiesTab.saving") : t("commonActions.save")}
        </Button>
      </Box>
    </Box>
  );
};
