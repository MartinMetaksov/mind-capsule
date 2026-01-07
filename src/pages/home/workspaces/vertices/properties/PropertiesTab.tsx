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
import type { VertexKind } from "@/core/common/vertexKind";
import type {
  ChildrenBehavior,
  ChildrenDisplayHint,
  VertexTabId,
} from "@/core/vertex";
import { ThumbnailPicker } from "../../components/VertexDialogs";
import { getFileSystem } from "@/integrations/fileSystem/integration";

type RefCounts = {
  vertex: number;
  url: number;
  image: number;
  file: number;
  note: number;
};

type PropertiesTabProps = {
  vertex: Vertex;
  workspace: Workspace;
  hasChildren: boolean;
  refCounts: RefCounts;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
  onSelectTab: (tab: VertexTabId) => void;
};

export const PropertiesTab: React.FC<PropertiesTabProps> = ({
  vertex,
  workspace: _workspace,
  hasChildren: _hasChildren,
  refCounts: _refCounts,
  onVertexUpdated,
  onSelectTab,
}) => {
  const [title, setTitle] = React.useState(vertex.title);
  const [kind, setKind] = React.useState<VertexKind>(vertex.kind);
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
    setKind(vertex.kind);
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
    { value: "children", label: "Children" },
    { value: "properties", label: "Properties" },
    { value: "tags", label: "Tags" },
    { value: "notes", label: "Notes" },
    { value: "images", label: "Images" },
    { value: "urls", label: "Links" },
  ];

  const childDisplayOptions: { value: ChildrenDisplayHint; label: string }[] = [
    { value: "grid", label: "Grid" },
    { value: "list", label: "List" },
    { value: "timeline", label: "Timeline" },
  ];

  const kindOptions: { value: VertexKind; label: string }[] = [
    { value: "project", label: "Project" },
    { value: "chapter", label: "Chapter" },
    { value: "section", label: "Section" },
    { value: "note", label: "Note" },
    { value: "generic", label: "Generic" },
  ];

  const isDirty =
    title !== vertex.title ||
    kind !== vertex.kind ||
    defaultTab !== (vertex.default_tab ?? "children") ||
    childBehavior.child_kind !==
      (vertex.children_behavior?.child_kind ?? "generic") ||
    childBehavior.display !== (vertex.children_behavior?.display ?? "grid") ||
    thumbnail !== vertex.thumbnail_path ||
    isLeaf !== Boolean(vertex.is_leaf);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const updated: Vertex = {
        ...vertex,
        title: title.trim(),
        kind,
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
        err instanceof Error ? err.message : "Failed to save properties."
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
          Properties
        </Typography>
        <Typography color="text.secondary">
          Manage the core properties for this vertex.
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
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Kind"
            select
            value={kind}
            onChange={(e) => setKind(e.target.value as VertexKind)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          >
            {kindOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Default tab"
            select
            value={defaultTab}
            onChange={(e) => setDefaultTab(e.target.value as VertexTabId)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          >
            {tabOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Leaf node"
            select
            value={isLeaf ? "yes" : "no"}
            onChange={(e) => setIsLeaf(e.target.value === "yes")}
            fullWidth
            InputLabelProps={{ shrink: true }}
            InputProps={{
              endAdornment: (
                <Tooltip title="If yes, this vertex will not show a children tab.">
                  <Typography component="span" sx={{ ml: 1, color: "text.secondary" }}>
                    ?
                  </Typography>
                </Tooltip>
              ),
            }}
          >
            <MenuItem value="no">No</MenuItem>
            <MenuItem value="yes">Yes</MenuItem>
          </TextField>

          <TextField
            label="Children kind"
            value={childBehavior.child_kind}
            onChange={(e) =>
              setChildBehavior((prev) => ({
                ...prev,
                child_kind: e.target.value,
              }))
            }
            fullWidth
            InputLabelProps={{ shrink: true }}
            placeholder="e.g. Chapter, Task, Project, Apple"
          />

          <TextField
            label="Children display"
            select
            value={childBehavior.display}
            onChange={(e) =>
              setChildBehavior((prev) => ({
                ...prev,
                display: e.target.value as ChildrenDisplayHint,
              }))
            }
            fullWidth
            InputLabelProps={{ shrink: true }}
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
          {saving ? "Saving…" : "Save"}
        </Button>
      </Box>
    </Box>
  );
};
