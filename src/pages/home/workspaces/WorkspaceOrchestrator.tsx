import * as React from "react";
import { Box, Paper, Typography } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

import { Loading } from "@/common/loading/Loading";
import { useWorkspaces } from "./hooks/useWorkspaces";
import { WorkspaceSetup } from "./workspace-setup/WorkspaceSetup";
import { useVertices } from "./hooks/useVertices";
import type { VertexItem } from "./vertices/VertexGrid";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";
import { BreadcrumbsTrail } from "./components/BreadcrumbsTrail";
import { VerticalTabs } from "./components/VerticalTabs";
import { ChildrenTab as WorkspaceChildrenTab } from "./children/ChildrenTab";
import { WorkspacesTab } from "./workspaces/WorkspacesTab";

import { VertexOrchestrator } from "./vertices/VertexOrchestrator";

type RootTab = "children" | "workspaces";

type TrailItem = {
  vertex: Vertex;
  workspace: Workspace;
};

const rootTabs = [
  {
    value: "children" as const,
    label: "Children",
    icon: <AccountTreeOutlinedIcon />,
  },
  {
    value: "workspaces" as const,
    label: "Workspaces",
    icon: <SettingsOutlinedIcon />,
  },
];

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

  const [trail, setTrail] = React.useState<TrailItem[]>([]);

  const active = trail.length > 0 ? trail[trail.length - 1] : null;

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

  const handleCreateVertexInWorkspace = (ws: Workspace) => {
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
    setTrail((prev) => prev.slice(0, index + 1));
  };

  const backToRoot = () => setTrail([]);

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

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "stretch",
          overflow: "hidden",
        }}
      >
        {/* LEFT TAB RAIL */}
        <Paper
          elevation={0}
          sx={(theme) => ({
            width: 110,
            flexShrink: 0,
            alignSelf: "stretch",
            height: "100%",
            borderRight: `1px solid ${theme.palette.divider}`,
            borderRadius: 0,
            display: "flex",
            flexDirection: "column",
            py: 0,
            overflow: "hidden",
            bgcolor: "background.paper",
          })}
        >
          <VerticalTabs value={tab} onChange={setTab} items={rootTabs} />
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
          <BreadcrumbsTrail rootLabel="Workspaces" />

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
            <WorkspaceChildrenTab
              items={vertexItems}
              workspaces={workspaces}
              onOpenVertex={openVertex}
              onCreateVertexInWorkspace={handleCreateVertexInWorkspace}
            />
          )}

          {/* WORKSPACES TAB */}
          {tab === "workspaces" && <WorkspacesTab workspaces={workspaces} />}
        </Box>
      </Box>
    </Box>
  );
};
