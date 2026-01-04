import * as React from "react";
import {
  Box,
  Breadcrumbs,
  Divider,
  Fab,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popover,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

import { Loading } from "@/common/loading/Loading";
import { useWorkspaces } from "./hooks/useWorkspaces";
import { WorkspaceSetup } from "./workspace-setup/WorkspaceSetup";
import { useVertices } from "./hooks/useVertices";
import { VertexGrid, VertexItem } from "./vertices/VertexGrid";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";

// detail view
import { VertexOrchestrator } from "./VertexOrchestrator";

type RootTab = "children" | "workspaces";

type TrailItem = {
  vertex: Vertex;
  workspace: Workspace;
};

export const WorkspaceOrchestrator: React.FC = () => {
  const {
    workspaces,
    loading: workspacesLoading,
    error: workspacesError,
    refreshWorkspaces,
  } = useWorkspaces();

  const {
    vertices,
    workspaceByVertexId,
    loading: verticesLoading,
    error: verticesError,
    reloadVertices,
  } = useVertices(workspaces);

  const [tab, setTab] = React.useState<RootTab>("children");

  // NEW: breadcrumb trail
  const [trail, setTrail] = React.useState<TrailItem[]>([]);

  // Derived: active vertex is the last in the trail
  const active = trail.length > 0 ? trail[trail.length - 1] : null;

  // ---------- FAB Popover (workspace picker) ----------
  const [fabAnchor, setFabAnchor] = React.useState<HTMLElement | null>(null);
  const popoverOpen = Boolean(fabAnchor);
  const openPopover = (e: React.MouseEvent<HTMLElement>) =>
    setFabAnchor(e.currentTarget);
  const closePopover = () => setFabAnchor(null);

  const [workspaceQuery, setWorkspaceQuery] = React.useState("");

  React.useEffect(() => {
    if (!popoverOpen) setWorkspaceQuery("");
  }, [popoverOpen]);

  const filteredWorkspaces = React.useMemo(() => {
    const q = workspaceQuery.trim().toLowerCase();
    if (!q) return workspaces ?? [];
    return (workspaces ?? []).filter((ws) => ws.name.toLowerCase().includes(q));
  }, [workspaces, workspaceQuery]);

  const vertexItems: VertexItem[] = React.useMemo(() => {
    const items: VertexItem[] = [];
    for (const v of vertices) {
      const ws = workspaceByVertexId[v.id];
      if (!ws) continue;
      items.push({ vertex: v, workspace: ws });
    }
    return items;
  }, [vertices, workspaceByVertexId]);

  const error = workspacesError ?? verticesError;

  // ---------- handlers ----------
  const handleCreateVertexInWorkspace = (ws: Workspace) => {
    closePopover();
    console.log("create vertex in workspace:", ws.id, ws.name);
  };

  const openVertex = (vertexId: string) => {
    const v = vertices.find((x) => x.id === vertexId);
    if (!v) return;

    const ws = workspaceByVertexId[v.id];
    if (!ws) return;

    setTrail((prev) => [...prev, { vertex: v, workspace: ws }]);
  };

  const jumpToTrailIndex = (index: number) => {
    // index is inclusive; keep [0..index]
    setTrail((prev) => prev.slice(0, index + 1));
  };

  const backToRoot = () => setTrail([]);

  // ---------- hook-safe returns ----------
  if (workspacesLoading || !workspaces) {
    return (
      <Box sx={{ p: 2 }}>
        <Loading />
      </Box>
    );
  }

  if (workspaces.length === 0) {
    return (
      <>
        {workspacesError && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Typography color="error" variant="body2">
              {workspacesError}
            </Typography>
          </Box>
        )}

        <WorkspaceSetup
          workspaces={workspaces}
          onChanged={async () => {
            await refreshWorkspaces();
            await reloadVertices();
          }}
        />
      </>
    );
  }

  // ---------- VERTEX DETAIL VIEW ----------
  if (active) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          flex: 1,
          minHeight: 0,
          display: "flex",
        }}
      >
        <VertexOrchestrator
          vertex={active.vertex}
          workspace={active.workspace}
          trail={trail}
          onBackToRoot={backToRoot}
          onJumpTo={(idx) => jumpToTrailIndex(idx)}
          onOpenVertex={(nextVertexId) => openVertex(nextVertexId)}
        />
      </Box>
    );
  }

  // ---------- ROOT VIEW ----------
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {/* LEFT TAB RAIL */}
        <Paper
          elevation={0}
          sx={(theme) => ({
            width: 110,
            flexShrink: 0,
            alignSelf: "stretch",
            borderRight: `1px solid ${theme.palette.divider}`,
            borderRadius: 0,
            display: "flex",
            flexDirection: "column",
            py: 1,
            overflow: "hidden",
            bgcolor: "background.paper",
          })}
        >
          <Tabs
            orientation="vertical"
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            sx={{
              flex: 1,
              minHeight: 0,
              "& .MuiTab-root": {
                minHeight: 84,
                px: 1,
                py: 1.2,
                textTransform: "none",
                gap: 0.5,
              },
              "& .MuiTab-wrapper": { gap: 0.5 },
            }}
          >
            <Tab
              value="children"
              icon={<AccountTreeOutlinedIcon />}
              iconPosition="top"
              label="Children"
            />
            <Tab
              value="workspaces"
              icon={<SettingsOutlinedIcon />}
              iconPosition="top"
              label="Workspaces"
            />
          </Tabs>
        </Paper>

        {/* CANVAS AREA */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            position: "relative",
            overflow: "hidden",
            bgcolor: "background.default",
          }}
        >
          {/* Breadcrumbs header */}
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              zIndex: 2,
              px: 2,
              py: 1.25,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
              <Typography color="text.primary" sx={{ fontWeight: 900 }}>
                Workspaces
              </Typography>
            </Breadcrumbs>
          </Box>

          {/* Error */}
          {error && (
            <Box sx={{ px: 2, pt: 7 }}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Box>
          )}

          {/* Loading */}
          {verticesLoading && (
            <Box sx={{ px: 2, pt: 7 }}>
              <Loading />
            </Box>
          )}

          {/* CHILDREN TAB */}
          {tab === "children" && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                pt: 6.5, // space for breadcrumb bar
                minHeight: 0,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <VertexGrid
                items={vertexItems}
                selectedVertexId={null}
                onSelect={(id) => openVertex(id)}
                onDeselect={() => {}}
                onOpenChildren={undefined}
                onOpenReferences={undefined}
              />

              {/* FAB */}
              <Tooltip title="Create vertex" placement="left">
                <Fab
                  color="primary"
                  onClick={openPopover}
                  sx={{
                    position: "absolute",
                    right: 20,
                    bottom: 20,
                  }}
                >
                  <AddRoundedIcon />
                </Fab>
              </Tooltip>

              {/* Workspace picker popover */}
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
                    Add vertex to workspace
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
                          onClick={() => handleCreateVertexInWorkspace(ws)}
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
          )}

          {/* WORKSPACES TAB */}
          {tab === "workspaces" && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                pt: 6.5, // space for breadcrumb bar
                overflow: "auto",
                p: 2,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                Workspaces
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Manage your workspaces here (create, rename, remove, change
                path).
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {workspaces.map((ws) => (
                  <Paper
                    key={ws.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800 }}>
                        {ws.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                      >
                        {ws.path}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      (CRUD soon)
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
