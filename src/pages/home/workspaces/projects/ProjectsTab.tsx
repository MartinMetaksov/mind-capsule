import * as React from "react";
import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  MenuItem,
  Paper,
  DialogContentText,
} from "@mui/material";

import { VertexGrid, VertexItem } from "../vertices/VertexGrid";
import { CreateFab } from "../components/CreateFab";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";
import type { VertexKind } from "@/core/common/vertexKind";
import { getFileSystem } from "@/integrations/fileSystem/integration";

type ProjectsTabProps = {
  title?: string;
  items: VertexItem[];
  workspaces: Workspace[];
  onOpenVertex: (vertexId: string) => void;
  onDeleteProject: (vertexId: string) => void;
  onChanged: () => Promise<void>;
};

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  title = "Projects",
  items,
  workspaces,
  onOpenVertex,
  onDeleteProject,
  onChanged,
}) => {
  const [fabAnchor, setFabAnchor] = React.useState<HTMLElement | null>(null);
  const popoverOpen = Boolean(fabAnchor);
  const openPopover = (e: React.MouseEvent<HTMLElement>) =>
    setFabAnchor(e.currentTarget);
  const closePopover = () => setFabAnchor(null);

  const [workspaceQuery, setWorkspaceQuery] = React.useState("");
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    if (!popoverOpen) setWorkspaceQuery("");
  }, [popoverOpen]);

  const filteredWorkspaces = React.useMemo(() => {
    const q = workspaceQuery.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((ws) => ws.name.toLowerCase().includes(q));
  }, [workspaces, workspaceQuery]);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [selectedWorkspace, setSelectedWorkspace] =
    React.useState<Workspace | null>(null);
  const [titleValue, setTitleValue] = React.useState("");
  const [kind, setKind] = React.useState<VertexKind>("project");
  const [thumbPreview, setThumbPreview] = React.useState<string | undefined>();
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<VertexItem | null>(
    null
  );
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleCreateProjectInWorkspace = (ws: Workspace) => {
    setSelectedWorkspace(ws);
    setEditorOpen(true);
    setError(null);
    closePopover();
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setSelectedWorkspace(null);
    setTitleValue("");
    setKind("project");
    setThumbPreview(undefined);
    setError(null);
  };

  // const handleWorkspacePick = (ws: Workspace) => {
  //   setSelectedWorkspace(ws);
  //   setEditorOpen(true);
  //   closePopover();
  // };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setThumbPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleThumbSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setThumbPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const saveProject = async () => {
    if (!selectedWorkspace) {
      setError("Select a workspace first.");
      return;
    }
    if (!titleValue.trim()) {
      setError("Title is required.");
      return;
    }
    try {
      const fs = await getFileSystem();
      const now = new Date().toISOString();
      const vertex: Vertex = {
        id: crypto.randomUUID(),
        title: titleValue.trim(),
        parent_id: undefined,
        workspace_id: selectedWorkspace.id,
        kind,
        default_tab: "children",
        created_at: now,
        updated_at: now,
        tags: [],
        thumbnail_path: thumbPreview,
      };
      await fs.createVertex(vertex);
      await onChanged();
      closeEditor();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create project."
      );
    }
  };

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pt: 6.5,
        minHeight: 0,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Box sx={{ px: 2, pb: 2, pt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {title}
        </Typography>

        <VertexGrid
          items={items}
          selectedVertexId={null}
          onSelect={(id) => onOpenVertex(id)}
          onDeselect={() => {}}
          onOpenChildren={undefined}
          onOpenReferences={undefined}
          onDeleteVertex={(v) => {
            const match = items.find((it) => it.vertex.id === v.id);
            if (match) setConfirmDelete(match);
          }}
        />
      </Box>

      <CreateFab
        onClick={openPopover}
        title="Create project"
        sx={{ position: "absolute", bottom: 20, right: 20 }}
      />

      <Dialog open={editorOpen} onClose={closeEditor} fullWidth maxWidth="sm">
        <DialogTitle>Create project</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: 2,
            pb: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Workspace: {selectedWorkspace?.name ?? "Not selected"}
          </Typography>

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
            onChange={(e) => setKind(e.target.value as VertexKind)}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="project">Project</MenuItem>
            <MenuItem value="chapter">Chapter</MenuItem>
            <MenuItem value="section">Section</MenuItem>
            <MenuItem value="note">Note</MenuItem>
            <MenuItem value="generic">Generic</MenuItem>
          </TextField>

          <Box>
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
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
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
              onChange={handleThumbSelect}
            />
          </Box>

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditor}>Cancel</Button>
          <Button variant="contained" onClick={saveProject}>
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
        <DialogTitle>Delete project</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{confirmDelete?.vertex.title ?? "this project"}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (confirmDelete) onDeleteProject(confirmDelete.vertex.id);
              setConfirmDelete(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Popover
        open={popoverOpen}
        anchorEl={fabAnchor}
        onClose={closePopover}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 340,
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ p: 1.25 }}>
          <Typography sx={{ fontWeight: 900, mb: 1 }}>
            Add project to workspace
          </Typography>

          <TextField
            size="small"
            fullWidth
            value={workspaceQuery}
            onChange={(e) => setWorkspaceQuery(e.target.value)}
            placeholder="Search workspaces…"
            autoFocus
          />
        </Box>

        <Divider />

        <Box sx={{ maxHeight: 320, overflowY: "auto" }}>
          <List dense disablePadding>
            {filteredWorkspaces.length === 0 ? (
              <Box sx={{ p: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  No workspaces found.
                </Typography>
              </Box>
            ) : (
              filteredWorkspaces.map((ws) => (
                <ListItemButton
                  key={ws.id}
                  onClick={() => handleCreateProjectInWorkspace(ws)}
                >
                  <ListItemText
                    primary={ws.name}
                    secondary={ws.purpose ?? ws.path}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Box>
      </Popover>
    </Box>
  );
};
