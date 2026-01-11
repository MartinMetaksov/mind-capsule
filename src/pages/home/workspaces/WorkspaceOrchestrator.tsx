import * as React from "react";
import { Box, Paper, Typography } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import WorkspacesOutlinedIcon from "@mui/icons-material/WorkspacesOutlined";

import { Loading } from "@/common/loading/Loading";
import { useWorkspaces } from "./hooks/use-workspaces/useWorkspaces";
import { WorkspaceSetup } from "./workspace-setup/WorkspaceSetup";
import { useVertices } from "./hooks/use-vertices/useVertices";
import type { VertexItem } from "./vertices/vertex-grid/VertexGrid";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";
import { BreadcrumbsTrail } from "./components/breadcrumbs-trail/BreadcrumbsTrail";
import { VerticalTabs } from "./components/vertical-tabs/VerticalTabs";
import { ProjectsTab } from "./projects/ProjectsTab";
import { WorkspacesTab } from "./workspaces/WorkspacesTab";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useLocation, useNavigate } from "react-router-dom";
import { VertexNotFound } from "./components/vertex-not-found/VertexNotFound";

import { VertexOrchestrator } from "./vertices/VertexOrchestrator";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { useTranslation } from "react-i18next";

type RootTab = "projects" | "workspaces";

type TrailItem = {
  vertex: Vertex;
  workspace: Workspace;
};

type NotFoundState = {
  missingId: string | null;
};

export const WorkspaceOrchestrator: React.FC = () => {
  const { t } = useTranslation("common");
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

  const [tab, setTab] = React.useState<RootTab>("projects");

  const [trail, setTrail] = React.useState<TrailItem[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [notFound, setNotFound] = React.useState<NotFoundState>({
    missingId: null,
  });
  const os = React.useMemo(() => detectOperatingSystem(), []);
  const rootTabs = React.useMemo(
    () => [
      {
        value: "projects" as const,
        label: t("workspace.tabs.projects"),
        icon: <AccountTreeOutlinedIcon />,
      },
      {
        value: "workspaces" as const,
        label: t("workspace.tabs.workspaces"),
        icon: <WorkspacesOutlinedIcon />,
      },
    ],
    [t]
  );

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

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab") as RootTab | null;
    if (!tabParam) return;
    const isRootTab = rootTabs.some((t) => t.value === tabParam);
    if (!isRootTab) return;

    setTab(tabParam);
    params.delete("tab");
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [location.pathname, location.search, navigate, rootTabs]);

  React.useEffect(() => {
    const shortcuts = [getShortcut("tab1", os), getShortcut("tab2", os)];
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut, idx) => {
        if (matchesShortcut(event, shortcut) && rootTabs[idx]) {
          event.preventDefault();
          setTab(rootTabs[idx].value);
        }
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [os, rootTabs]);

  const error = workspacesError ?? verticesError;

  const handleDeleteProject = async (vertexId: string) => {
    const fs = await getFileSystem();
    const v = vertices.find((x) => x.id === vertexId);
    if (!v) return;
    await fs.removeVertex(v);
    setTrail((prev) => prev.filter((t) => t.vertex.id !== vertexId));
    await reloadVertices();
  };

  const openVertex = React.useCallback(
    async (vertexId: string) => {
      const fs = await getFileSystem();

      let v = vertices.find((x) => x.id === vertexId) ?? null;
      let ws = v
        ? (workspaceByVertexId[v.id] ??
          workspaces.find((w) => w.id === v!.workspace_id))
        : undefined;

      if (!v) {
        v = (await fs.getVertex(vertexId)) ?? null;
      }

      if (!v) return;

      if (!ws) {
        ws = workspaces.find((w) => w.id === v.workspace_id);
      }

      if (!ws) return;

      setTrail((prev) => {
        const nextTrail = [...prev, { vertex: v, workspace: ws }];
        navigate(`/${nextTrail.map((t) => t.vertex.id).join("/")}`, {
          replace: false,
        });
        return nextTrail;
      });
    },
    [navigate, vertices, workspaceByVertexId, workspaces]
  );

  const jumpToTrailIndex = (index: number) => {
    setTrail((prev) => {
      const next = prev.slice(0, index + 1);
      navigate(`/${next.map((t) => t.vertex.id).join("/")}`);
      return next;
    });
  };

  const backToRoot = () => {
    setTrail([]);
    navigate("/");
    setNotFound({ missingId: null });
  };

  React.useEffect(() => {
    const syncTrailFromPath = async () => {
      if (workspacesLoading || !workspaces) return;
      const segments = location.pathname.split("/").filter(Boolean);
      if (segments.length === 0) {
        setTrail([]);
        setNotFound({ missingId: null });
        return;
      }

      const fs = await getFileSystem();
      const nextTrail: TrailItem[] = [];
      let failedId: string | null = null;

      let currentWorkspace: Workspace | undefined;
      for (let i = 0; i < segments.length; i++) {
        const vid = segments[i];
        const v = (await fs.getVertex(vid)) ?? null;
        if (!v) {
          failedId = vid;
          break;
        }

        if (i === 0) {
          currentWorkspace = workspaces.find((w) => w.id === v.workspace_id);
          if (!currentWorkspace) break;
        }

        if (!currentWorkspace) break;
        nextTrail.push({ vertex: v, workspace: currentWorkspace });
      }

      setTrail(nextTrail);
      setNotFound({ missingId: failedId });
    };

    syncTrailFromPath();
  }, [location.pathname, workspaces, workspacesLoading]);

  if (workspacesLoading || !workspaces) {
    return (
      <Box sx={{ p: 2 }}>
        <Loading />
      </Box>
    );
  }

  if (notFound.missingId) {
    return (
      <VertexNotFound missingId={notFound.missingId} onBack={backToRoot} />
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
          onVertexUpdated={async (updated) => {
            // update active trail entry immediately
            setTrail((prev) =>
              prev.map((t) =>
                t.vertex.id === updated.id ? { ...t, vertex: updated } : t
              )
            );
            await reloadVertices();
            // refresh the active vertex from storage to keep references in sync across tabs
            const fs = await getFileSystem();
            const fresh = await fs.getVertex(updated.id);
            if (fresh) {
              setTrail((prev) =>
                prev.map((t) =>
                  t.vertex.id === fresh.id ? { ...t, vertex: fresh } : t
                )
              );
            }
          }}
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
          {/* PROJECTS TAB */}
          {tab === "projects" && (
            <>
              <BreadcrumbsTrail rootLabel={t("workspace.rootLabel")} />
              {error && (
                <Box sx={{ px: 2, pt: 7 }}>
                  <Typography color="error" variant="body2">
                    {error}
                  </Typography>
                </Box>
              )}
              {verticesLoading && (
                <Box sx={{ px: 2, pt: 7 }}>
                  <Loading />
                </Box>
              )}
              <ProjectsTab
                title={t("workspace.tabs.projects")}
                items={vertexItems}
                workspaces={workspaces}
                onOpenVertex={openVertex}
                onDeleteProject={handleDeleteProject}
                onChanged={async () => {
                  await refreshWorkspaces();
                  await reloadVertices();
                }}
              />
            </>
          )}

          {/* WORKSPACES TAB */}
          {tab === "workspaces" && (
            <WorkspacesTab
              workspaces={workspaces}
              onChanged={async () => {
                await refreshWorkspaces();
                await reloadVertices();
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};
