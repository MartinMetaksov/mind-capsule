import * as React from "react";
import {
  Alert,
  Box,
  Chip,
  Divider,
  IconButton,
  Link,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import type {
  ItemsBehavior,
  ItemsDisplayHint,
  VertexTabId,
} from "@/core/vertex";
import { ThumbnailPicker } from "../../../components/vertex-dialogs/VertexDialogs";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";

type PropertiesTabProps = {
  vertex: Vertex;
  workspace: Workspace;
  hasItems: boolean;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
  onSelectTab: (tab: VertexTabId) => void;
};

type TagsEditorProps = {
  tags: string[];
  onAdd: (tag: string) => Promise<void> | void;
  onRemove: (tag: string) => Promise<void> | void;
  autoFocus?: boolean;
};

const TagsEditor: React.FC<TagsEditorProps> = ({
  tags,
  onAdd,
  onRemove,
  autoFocus = false,
}) => {
  const { t } = useTranslation("common");
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const focusInput = React.useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  React.useEffect(() => {
    if (autoFocus) {
      focusInput();
    }
  }, [autoFocus, focusInput]);

  const handleAdd = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setInput("");
      focusInput();
      return;
    }
    await onAdd(trimmed);
    setInput("");
    focusInput();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleAdd();
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems="center"
      >
        <TextField
          label={t("tagsTab.newTag")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          fullWidth
          size="small"
          InputLabelProps={{ shrink: true }}
          placeholder={t("tagsTab.placeholder")}
          sx={{
            "& .MuiInputBase-root": {
              bgcolor: "background.paper",
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleAdd}
          disabled={!input.trim()}
          aria-label={t("tagsTab.add")}
          sx={{ border: 1, borderColor: "divider" }}
        >
          <AddIcon />
        </IconButton>
      </Stack>

      {tags.length === 0 ? (
        <Typography color="text.secondary">{t("tagsTab.empty")}</Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              variant="outlined"
              onDelete={() => onRemove(tag)}
              sx={{ bgcolor: "background.paper" }}
              deleteIcon={
                <ClearIcon
                  fontSize="small"
                  data-testid={`delete-tag-${tag}`}
                  aria-label={`delete-tag-${tag}`}
                />
              }
            />
          ))}
        </Box>
      )}
    </Box>
  );
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
  const titleInputRef = React.useRef<HTMLInputElement | null>(null);
  const [defaultTab, setDefaultTab] = React.useState<VertexTabId>(
    vertex.default_tab ?? "items",
  );
  const [itemsBehavior, setItemsBehavior] = React.useState<ItemsBehavior>({
    child_kind: vertex.items_behavior?.child_kind ?? "generic",
    display: vertex.items_behavior?.display ?? "grid",
  });
  const [thumbnail, setThumbnail] = React.useState<string | undefined>(
    vertex.thumbnail_path,
  );
  const [isLeaf, setIsLeaf] = React.useState<boolean>(Boolean(vertex.is_leaf));
  const [tags, setTags] = React.useState<string[]>(vertex.tags ?? []);
  const [error, setError] = React.useState<string | null>(null);
  const assetDirectory = vertex.asset_directory;

  React.useEffect(() => {
    setTitle(vertex.title);
    setDefaultTab(vertex.default_tab ?? "items");
    setItemsBehavior({
      child_kind: vertex.items_behavior?.child_kind ?? "generic",
      display: vertex.items_behavior?.display ?? "grid",
    });
    setThumbnail(vertex.thumbnail_path);
    setIsLeaf(Boolean(vertex.is_leaf));
    setTags(vertex.tags ?? []);
    setError(null);
    requestAnimationFrame(() => {
      const input = titleInputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      const length = input.value.length;
      input.setSelectionRange(length, length);
    });
  }, [vertex]);

  const handleOpenAssetDirectory = React.useCallback(async () => {
    if (!assetDirectory) return;
    try {
      const { isTauri, invoke } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        await invoke("fs_open_path", { path: assetDirectory });
        return;
      }
      window.open(
        encodeURI(`file://${assetDirectory}`),
        "_blank",
        "noreferrer",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open folder.");
    }
  }, [assetDirectory]);

  const tabOptions: { value: VertexTabId; label: string }[] = [
    { value: "items", label: t("vertex.tabs.items") },
    { value: "properties", label: t("vertex.tabs.properties") },
    { value: "notes", label: t("vertex.tabs.notes") },
    { value: "urls", label: t("vertex.tabs.links") },
    { value: "images", label: t("vertex.tabs.images") },
    { value: "tags", label: t("vertex.tabs.files") },
  ];

  const itemsDisplayOptions: { value: ItemsDisplayHint; label: string }[] = [
    { value: "grid", label: t("propertiesTab.itemsDisplay.grid") },
    { value: "list", label: t("propertiesTab.itemsDisplay.list") },
    { value: "graph", label: t("propertiesTab.itemsDisplay.graph") },
  ];

  const buildUpdated = React.useCallback(
    (overrides: Partial<Vertex>) => ({
      ...vertex,
      title: overrides.title ?? vertex.title,
      default_tab: overrides.default_tab ?? defaultTab,
      items_behavior: overrides.items_behavior ?? itemsBehavior,
      thumbnail_path: overrides.thumbnail_path ?? thumbnail,
      is_leaf: overrides.is_leaf ?? isLeaf,
      tags: overrides.tags ?? tags,
      updated_at: new Date().toISOString(),
    }),
    [defaultTab, isLeaf, itemsBehavior, tags, thumbnail, vertex],
  );

  const persistVertex = React.useCallback(
    async (updated: Vertex, syncTab?: boolean) => {
      try {
        const fs = await getFileSystem();
        await fs.updateVertex(updated);
        await onVertexUpdated?.(updated);
        if (syncTab) {
          onSelectTab(
            updated.is_leaf
              ? ("properties" as VertexTabId)
              : (updated.default_tab ?? "items"),
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("propertiesTab.errors.save"),
        );
      }
    },
    [onSelectTab, onVertexUpdated, t],
  );

  const handleTitleBlur = React.useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError(t("propertiesTab.errors.titleRequired"));
      setTitle(vertex.title);
      return;
    }
    if (trimmed === vertex.title) return;
    const updated = buildUpdated({ title: trimmed });
    setTitle(trimmed);
    await persistVertex(updated);
  }, [buildUpdated, persistVertex, t, title, vertex.title]);

  const handleDefaultTabChange = async (next: VertexTabId) => {
    setDefaultTab(next);
    await persistVertex(buildUpdated({ default_tab: next }), true);
  };

  const handleItemsDisplayChange = async (next: ItemsDisplayHint) => {
    const nextBehavior = { ...itemsBehavior, display: next };
    setItemsBehavior(nextBehavior);
    await persistVertex(buildUpdated({ items_behavior: nextBehavior }));
  };

  const handleLeafChange = async (next: boolean) => {
    setIsLeaf(next);
    await persistVertex(buildUpdated({ is_leaf: next }), true);
  };

  const handleThumbnailChange = async (next?: string) => {
    setThumbnail(next);
    await persistVertex(buildUpdated({ thumbnail_path: next }));
  };

  const handleAddTag = async (tag: string) => {
    const next = [...tags, tag];
    setTags(next);
    await persistVertex(buildUpdated({ tags: next }));
  };

  const handleRemoveTag = async (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    await persistVertex(buildUpdated({ tags: next }));
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ width: "100%", maxWidth: 760, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {t("vertex.tabs.properties")}
        </Typography>
        <Typography color="text.secondary">
          {t("propertiesTab.subtitle")}
        </Typography>
        <Box sx={{ mt: 1 }}>
          {assetDirectory ? (
            <Tooltip title={assetDirectory} placement="top-start">
              <Link
                component="button"
                type="button"
                variant="caption"
                underline="hover"
                onClick={handleOpenAssetDirectory}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  textAlign: "left",
                }}
              >
                {t("propertiesTab.assetDirectoryLabel")}
              </Link>
            </Tooltip>
          ) : (
            <Typography variant="caption" color="text.secondary">
              {t("propertiesTab.assetDirectoryLabel")}
            </Typography>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          bgcolor: "background.paper",
          width: { xs: "100%", md: "fit-content" },
          maxWidth: "100%",
          minWidth: { xs: "100%", md: 640 },
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          borderRadius: "15px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            maxWidth: 760,
            width: "100%",
            pb: 3,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {t("propertiesTab.sections.general")}
            </Typography>
            <Box sx={{ width: 240, alignSelf: "center" }}>
              <ThumbnailPicker
                value={thumbnail}
                onChange={handleThumbnailChange}
                height={160}
              />
            </Box>
            <TextField
              label={t("vertexDialog.fields.title")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              fullWidth
              inputRef={titleInputRef}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{
                "& .MuiInputBase-root": {
                  bgcolor: "background.paper",
                },
              }}
            />
          </Box>

          <Divider />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {t("propertiesTab.sections.display")}
            </Typography>
            <TextField
              label={t("propertiesTab.defaultTab")}
              select
              value={defaultTab}
              onChange={(e) =>
                handleDefaultTabChange(e.target.value as VertexTabId)
              }
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{
                "& .MuiInputBase-root": {
                  bgcolor: "background.paper",
                },
              }}
            >
              {tabOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label={t("propertiesTab.items.display")}
                select
                value={itemsBehavior.display}
                onChange={(e) =>
                  handleItemsDisplayChange(e.target.value as ItemsDisplayHint)
                }
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{
                  "& .MuiInputBase-root": {
                    bgcolor: "background.paper",
                  },
                }}
              >
                {itemsDisplayOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label={
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <span>{t("propertiesTab.leaf.label")}</span>
                    <Tooltip title={t("propertiesTab.leaf.tooltip")}>
                      <Typography
                        component="span"
                        sx={{ color: "text.secondary" }}
                      >
                        ?
                      </Typography>
                    </Tooltip>
                  </Box>
                }
                select
                value={isLeaf ? "yes" : "no"}
                onChange={(e) => handleLeafChange(e.target.value === "yes")}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{
                  "& .MuiInputBase-root": {
                    bgcolor: "background.paper",
                  },
                }}
              >
                <MenuItem value="no">{t("propertiesTab.leaf.no")}</MenuItem>
                <MenuItem value="yes">{t("propertiesTab.leaf.yes")}</MenuItem>
              </TextField>
            </Stack>
          </Box>

          <Divider />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {t("propertiesTab.sections.tags")}
            </Typography>
            <TagsEditor
              tags={tags}
              onAdd={handleAddTag}
              onRemove={handleRemoveTag}
              autoFocus={false}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
