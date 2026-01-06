import * as React from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  TextField,
  MenuItem,
} from "@mui/material";

import { VertexGrid, VertexItem } from "../VertexGrid";
import { CreateFab } from "../../components/CreateFab";
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
  const [confirmDelete, setConfirmDelete] = React.useState<VertexItem | null>(
    null
  );
  const [createOpen, setCreateOpen] = React.useState(false);
  const [titleValue, setTitleValue] = React.useState("");
  const [thumbPreview, setThumbPreview] = React.useState<string | undefined>();
  const [kind, setKind] = React.useState<Vertex["kind"]>(
    vertex.children_behavior?.child_kind ?? "generic"
  );
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const loadChildren = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const vertices = await fs.getVertices(vertex.id);
      setChildren(vertices.map((v) => ({ vertex: v, workspace })));
    } catch (err) {
      console.error("Failed to load child vertices:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load child vertices."
      );
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [vertex.id, workspace]);

  React.useEffect(() => {
    loadChildren();
  }, [loadChildren, vertex.id]);

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
              onDeleteVertex={(v) => {
                const match = children.find((c) => c.vertex.id === v.id);
                if (match) setConfirmDelete(match);
              }}
              scrollY
              showWorkspaceLabel={false}
            />
          </Box>
        )}
      </Box>
      <CreateFab
        onClick={() => {
          setTitleValue("");
          setThumbPreview(undefined);
          setCreateError(null);
          setCreateOpen(true);
        }}
        title="Create child"
        sx={{ position: "absolute", bottom: 20, right: 20 }}
      />
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create child</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: 2,
            pb: 1,
          }}
        >
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Kind"
              select
              fullWidth
              value={kind}
              onChange={(e) => setKind(e.target.value as Vertex["kind"])}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="project">Project</MenuItem>
              <MenuItem value="chapter">Chapter</MenuItem>
              <MenuItem value="section">Section</MenuItem>
              <MenuItem value="note">Note</MenuItem>
              <MenuItem value="generic">Generic</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Thumbnail
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                textAlign: "center",
                cursor: "pointer",
                bgcolor: "background.default",
                minHeight: 260,
                borderStyle: dragging ? "dashed" : "solid",
                borderWidth: 1,
                borderColor: dragging ? "primary.main" : "divider",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string")
                    setThumbPreview(reader.result);
                };
                reader.readAsDataURL(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragging(false);
              }}
            >
              {thumbPreview ? (
                <Box
                  component="img"
                  src={thumbPreview}
                  alt="thumbnail preview"
                  sx={{ maxWidth: "100%", maxHeight: 160, borderRadius: 1 }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Drag & drop or click to add an image
                </Typography>
              )}
            </Paper>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string")
                    setThumbPreview(reader.result);
                };
                reader.readAsDataURL(file);
              }}
            />
          </Box>
          {createError && (
            <Typography color="error" variant="body2">
              {createError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!titleValue.trim()) {
                setCreateError("Title is required.");
                return;
              }
              try {
                const fs = await getFileSystem();
                const now = new Date().toISOString();
                const newVertex: Vertex = {
                  id: crypto.randomUUID(),
                  title: titleValue.trim(),
                  parent_id: vertex.id,
                  workspace_id: workspace.id,
                  kind,
                  default_tab: "children",
                  created_at: now,
                  updated_at: now,
                  tags: [],
                  thumbnail_path: thumbPreview,
                };
                await fs.createVertex(newVertex);
                setCreateOpen(false);
                await loadChildren();
              } catch (err) {
                setCreateError(
                  err instanceof Error ? err.message : "Failed to create child."
                );
              }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete child</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{confirmDelete?.vertex.title ?? "this child"}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!confirmDelete) return;
              try {
                const fs = await getFileSystem();
                await fs.removeVertex(confirmDelete.vertex);
                setConfirmDelete(null);
                await loadChildren();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Failed to delete child."
                );
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
