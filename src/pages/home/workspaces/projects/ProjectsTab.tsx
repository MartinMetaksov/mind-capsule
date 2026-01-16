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
import { VertexGrid, VertexItem } from "../vertices/vertex-grid/VertexGrid";
import {
  CreateFab,
  type CreateFabHandle,
} from "../components/create-fab/CreateFab";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";
import {
  CreateVertexDialog,
  DeleteVertexDialog,
  CreateVertexForm,
} from "../components/vertex-dialogs/VertexDialogs";

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
  const { t } = useTranslation("common");
  const fabRef = React.useRef<CreateFabHandle | null>(null);
  const [fabAnchor, setFabAnchor] = React.useState<HTMLElement | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [selectedWorkspace, setSelectedWorkspace] =
    React.useState<Workspace | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<VertexItem | null>(
    null
  );
  const [workspaceQuery, setWorkspaceQuery] = React.useState("");
  const os = React.useMemo(() => detectOperatingSystem(), []);
  const createShortcut = React.useMemo(
    () => getShortcut("insert", os),
    [os]
  );

  const filteredWorkspaces = React.useMemo(() => {
    const q = workspaceQuery.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((ws) => ws.name.toLowerCase().includes(q));
  }, [workspaces, workspaceQuery]);

  const handleCreateProjectInWorkspace = (ws: Workspace) => {
    setSelectedWorkspace(ws);
    setEditorOpen(true);
    setError(null);
    setFabAnchor(null);
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, createShortcut)) {
        e.preventDefault();
        const buttonEl = fabRef.current?.button;
        setFabAnchor(buttonEl ?? document.body);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createShortcut]);

  const handleCreate = async (data: CreateVertexForm) => {
    if (!selectedWorkspace) {
      setError(t("projects.errors.selectWorkspace"));
      return;
    }
    try {
      const fs = await getFileSystem();
      const now = new Date().toISOString();
      const vertex: Vertex = {
        id: crypto.randomUUID(),
        title: data.title,
        asset_directory: "",
        parent_id: null,
        workspace_id: selectedWorkspace.id,
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
        err instanceof Error ? err.message : t("projects.errors.create")
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
              {t("projects.empty")}
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
        ref={fabRef}
        onClick={(e) => setFabAnchor(e.currentTarget)}
        title={t("projects.create")}
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
        submitLabel={t("projects.create")}
        title={t("projects.create")}
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
        entityLabel={t("projects.entityLabel")}
      />
      <Popover
        open={Boolean(fabAnchor)}
        anchorEl={fabAnchor}
        onClose={() => setFabAnchor(null)}
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
            {t("projects.addToWorkspace")}
          </Typography>

          <TextField
            size="small"
            fullWidth
            value={workspaceQuery}
            onChange={(e) => setWorkspaceQuery(e.target.value)}
            placeholder={t("projects.searchPlaceholder")}
            autoFocus
          />
        </Box>

        <Divider />

        <Box sx={{ maxHeight: 320, overflowY: "auto" }}>
          <List dense disablePadding>
            {filteredWorkspaces.length === 0 ? (
              <Box sx={{ p: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {t("projects.noWorkspaces")}
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
                    secondary={ws.path}
                    slotProps={{ secondary: { noWrap: true } }}
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
