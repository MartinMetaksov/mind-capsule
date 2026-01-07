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
} from "@mui/material";
import { VertexGrid, VertexItem } from "../vertices/VertexGrid";
import { CreateFab } from "../components/CreateFab";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";
import type { VertexKind } from "@/core/common/vertexKind";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import {
  CreateVertexDialog,
  DeleteVertexDialog,
  CreateVertexForm,
} from "../components/VertexDialogs";

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
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [selectedWorkspace, setSelectedWorkspace] =
    React.useState<Workspace | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<VertexItem | null>(
    null,
  );
  const defaultKind: VertexKind = "project";

  React.useEffect(() => {
    if (!popoverOpen) setWorkspaceQuery("");
  }, [popoverOpen]);

  const filteredWorkspaces = React.useMemo(() => {
    const q = workspaceQuery.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((ws) => ws.name.toLowerCase().includes(q));
  }, [workspaces, workspaceQuery]);

  const handleCreateProjectInWorkspace = (ws: Workspace) => {
    setSelectedWorkspace(ws);
    setEditorOpen(true);
    setError(null);
    closePopover();
  };

  const handleCreate = async (data: CreateVertexForm) => {
    if (!selectedWorkspace) {
      setError("Select a workspace first.");
      return;
    }
    try {
      const fs = await getFileSystem();
      const now = new Date().toISOString();
      const vertex: Vertex = {
        id: crypto.randomUUID(),
        title: data.title,
        parent_id: undefined,
        workspace_id: selectedWorkspace.id,
        kind: data.kind,
        default_tab: "children",
        created_at: now,
        updated_at: now,
        tags: [],
        thumbnail_path: data.thumbnail,
      };
      await fs.createVertex(vertex);
      await onChanged();
      setEditorOpen(false);
      setSelectedWorkspace(null);
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

        {items.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography color="text.secondary" align="center">
              No projects yet. Create one to get started.
            </Typography>
          </Box>
        ) : (
          <VertexGrid
            items={items}
            selectedVertexId={null}
            onSelect={(id) => onOpenVertex(id)}
            onDeleteVertex={(v) => {
              const match = items.find((it) => it.vertex.id === v.id);
              if (match) setConfirmDelete(match);
            }}
          />
        )}
      </Box>

      <CreateFab
        onClick={openPopover}
        title="Create project"
        sx={{ position: "absolute", bottom: 20, right: 20 }}
      />

      <CreateVertexDialog
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setSelectedWorkspace(null);
          setError(null);
        }}
        onSubmit={handleCreate}
        workspaceLabel={selectedWorkspace?.name}
        defaultKind={defaultKind}
        submitLabel="Create project"
        title="Create project"
      />
      {error && (
        <Typography color="error" variant="body2" sx={{ px: 2, pt: 1 }}>
          {error}
        </Typography>
      )}

      <DeleteVertexDialog
        open={Boolean(confirmDelete)}
        name={confirmDelete?.vertex.title}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) onDeleteProject(confirmDelete.vertex.id);
          setConfirmDelete(null);
        }}
        entityLabel="project"
      />

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
