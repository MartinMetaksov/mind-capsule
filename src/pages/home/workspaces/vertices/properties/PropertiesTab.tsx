import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import type {
  ChildrenBehavior,
  ChildrenDisplayHint,
  VertexTabId,
} from "@/core/vertex";
import { ThumbnailPicker } from "../../components/vertex-dialogs/VertexDialogs";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";

type PropertiesTabProps = {
  vertex: Vertex;
  workspace: Workspace;
  hasChildren: boolean;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
  onSelectTab: (tab: VertexTabId) => void;
};

export const PropertiesTab: React.FC<PropertiesTabProps> = ({
  vertex,
  workspace: _workspace,
  hasChildren: _hasChildren,
  onVertexUpdated,
  onSelectTab,
}) => {
  const { t } = useTranslation("common");
  const [title, setTitle] = React.useState(vertex.title);
  const [defaultTab, setDefaultTab] = React.useState<VertexTabId>(
    vertex.default_tab ?? "children"
  );
  const [childBehavior, setChildBehavior] = React.useState<ChildrenBehavior>({
    child_kind: vertex.children_behavior?.child_kind ?? "generic",
    display: vertex.children_behavior?.display ?? "grid",
  });
  const [thumbnail, setThumbnail] = React.useState<string | undefined>(
    vertex.thumbnail_path
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLeaf, setIsLeaf] = React.useState<boolean>(Boolean(vertex.is_leaf));

  React.useEffect(() => {
    setTitle(vertex.title);
    setDefaultTab(vertex.default_tab ?? "children");
    setChildBehavior({
      child_kind: vertex.children_behavior?.child_kind ?? "generic",
      display: vertex.children_behavior?.display ?? "grid",
    });
    setThumbnail(vertex.thumbnail_path);
    setError(null);
    setIsLeaf(Boolean(vertex.is_leaf));
  }, [vertex]);

  const tabOptions: { value: VertexTabId; label: string }[] = [
    { value: "children", label: t("vertex.tabs.children") },
    { value: "properties", label: t("vertex.tabs.properties") },
    { value: "tags", label: t("vertex.tabs.tags") },
    { value: "notes", label: t("vertex.tabs.notes") },
    { value: "images", label: t("vertex.tabs.images") },
    { value: "urls", label: t("vertex.tabs.links") },
  ];

  const childDisplayOptions: { value: ChildrenDisplayHint; label: string }[] = [
    { value: "grid", label: t("propertiesTab.childrenDisplay.grid") },
    { value: "list", label: t("propertiesTab.childrenDisplay.list") },
    { value: "timeline", label: t("propertiesTab.childrenDisplay.timeline") },
  ];

  const isDirty =
    title !== vertex.title ||
    defaultTab !== (vertex.default_tab ?? "children") ||
    childBehavior.child_kind !==
      (vertex.children_behavior?.child_kind ?? "generic") ||
    childBehavior.display !== (vertex.children_behavior?.display ?? "grid") ||
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
        children_behavior: childBehavior,
        thumbnail_path: thumbnail,
        updated_at: new Date().toISOString(),
        is_leaf: isLeaf,
      };
      await fs.updateVertex(updated);
      await onVertexUpdated?.(updated);
      onSelectTab(
        updated.is_leaf
          ? ("properties" as VertexTabId)
          : (updated.default_tab ?? "children")
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
            label={t("propertiesTab.children.kind")}
            value={childBehavior.child_kind}
            onChange={(e) =>
              setChildBehavior((prev) => ({
                ...prev,
                child_kind: e.target.value,
              }))
            }
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            placeholder={t("propertiesTab.children.placeholder")}
          />

          <TextField
            label={t("propertiesTab.children.display")}
            select
            value={childBehavior.display}
            onChange={(e) =>
              setChildBehavior((prev) => ({
                ...prev,
                display: e.target.value as ChildrenDisplayHint,
              }))
            }
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          >
            {childDisplayOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <ThumbnailPicker
          value={thumbnail}
          onChange={setThumbnail}
          height={240}
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
