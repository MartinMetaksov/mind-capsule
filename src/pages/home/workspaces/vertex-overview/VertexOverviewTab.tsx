import * as React from "react";
import { Alert, Box, Typography } from "@mui/material";

import { VertexGrid, VertexItem, type VertexItemCounts } from "./views/grid/VertexGrid";
import {
  CreateFab,
  type CreateFabHandle,
} from "../components/create-fab/CreateFab";
import type { Vertex } from "@/core/vertex";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { useTranslation } from "react-i18next";
import { getFileSystem } from "@/integrations/fileSystem/integration";

import { ItemsHeader } from "./components/ItemsHeader";
import { ItemsDialogs } from "./components/ItemsDialogs";
import { ProjectsDialogs } from "./components/ProjectsDialogs";
import { ProjectsWorkspacePopover } from "./components/ProjectsWorkspacePopover";
import { DetachedDialogs } from "./components/DetachedDialogs";
import { VertexRowActions } from "./components/VertexRowActions";
import { ViewModeTabs } from "./components/ViewModeTabs";
import { useItemsOverview } from "./hooks/useItemsOverview";
import { useProjectsOverview } from "./hooks/useProjectsOverview";
import { useDetachedOverview } from "./hooks/useDetachedOverview";
import type {
  OverviewViewMode,
  VertexOverviewTabProps,
} from "./types";
import { VertexListView } from "./views/list/VertexListView";
import { GraphView } from "./views/graph/GraphView";

export { type VertexOverviewTabProps } from "./types";

const buildOrderMap = (items: VertexItem[]) =>
  Object.fromEntries(items.map((item, index) => [item.vertex.id, index]));

const sortItems = (items: VertexItem[], orderMap: Record<string, number>) => {
  return [...items].sort((a, b) => {
    const aOrder = orderMap[a.vertex.id];
    const bOrder = orderMap[b.vertex.id];
    if (aOrder === undefined && bOrder === undefined) {
      return a.vertex.title.localeCompare(b.vertex.title);
    }
    if (aOrder === undefined) return 1;
    if (bOrder === undefined) return -1;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.vertex.title.localeCompare(b.vertex.title);
  });
};

const REORDER_END_ID = "__end__";

const moveItem = (items: VertexItem[], sourceId: string, targetId: string) => {
  const fromIndex = items.findIndex((item) => item.vertex.id === sourceId);
  if (fromIndex < 0) return items;
  if (targetId === REORDER_END_ID) {
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.push(moved);
    return next;
  }
  const toIndex = items.findIndex((item) => item.vertex.id === targetId);
  if (toIndex < 0 || fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

export const VertexOverviewTab: React.FC<VertexOverviewTabProps> = (props) => {
  const { t } = useTranslation("common");
  const os = React.useMemo(() => detectOperatingSystem(), []);
  const createShortcut = React.useMemo(() => getShortcut("insert", os), [os]);
  const prevShortcut = React.useMemo(
    () => getShortcut("searchPrevResult", os),
    [os]
  );
  const nextShortcut = React.useMemo(
    () => getShortcut("searchNextResult", os),
    [os]
  );
  const viewGridShortcut = React.useMemo(() => getShortcut("viewGrid", os), [os]);
  const viewListShortcut = React.useMemo(() => getShortcut("viewList", os), [os]);
  const viewGraphShortcut = React.useMemo(() => getShortcut("viewGraph", os), [os]);

  const itemsProps = props.variant === "items" ? props : null;
  const projectsProps = props.variant === "projects" ? props : null;
  const detachedProps = props.variant === "detached" ? props : null;

  const projectWorkspaceId =
    projectsProps?.items[0]?.workspace.id ?? projectsProps?.workspaces[0]?.id;

  const orderKey = React.useMemo(() => {
    if (projectsProps) {
      return projectWorkspaceId
        ? `vertexOverview.order.projects:${projectWorkspaceId}`
        : "vertexOverview.order.projects";
    }
    if (detachedProps) {
      return "vertexOverview.order.detached";
    }
    return "";
  }, [detachedProps, projectWorkspaceId, projectsProps]);

  const resolveViewMode = React.useCallback(
    (display?: string): OverviewViewMode => {
      if (display === "list") return "list";
      if (display === "graph") return "graph";
      return "grid";
    },
    []
  );

  const [viewMode, setViewMode] = React.useState<OverviewViewMode>(() =>
    resolveViewMode(
      props.variant === "items"
        ? itemsProps?.vertex?.items_behavior?.display
        : undefined
    )
  );
  const [countsByVertexId, setCountsByVertexId] = React.useState<
    Record<string, VertexItemCounts>
  >({});

  React.useEffect(() => {
    let nextMode: OverviewViewMode = "grid";
    const currentVertexId = itemsProps?.vertex?.id;
    if (props.variant === "items") {
      nextMode = resolveViewMode(itemsProps?.vertex?.items_behavior?.display);
    }
    if (typeof window !== "undefined") {
      const globalMode = (
        window as unknown as {
          __vertexOverviewViewMode?: { mode?: OverviewViewMode; vertexId?: string };
        }
      ).__vertexOverviewViewMode;
      if (globalMode?.mode && globalMode.vertexId === currentVertexId) {
        (
          window as unknown as { __vertexOverviewViewMode?: unknown }
        ).__vertexOverviewViewMode = undefined;
        nextMode = globalMode.mode;
      } else {
        const stored = window.sessionStorage.getItem("vertexOverview.viewMode");
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as {
              mode?: OverviewViewMode;
              vertexId?: string;
            };
            if (parsed.mode && parsed.vertexId === currentVertexId) {
              window.sessionStorage.removeItem("vertexOverview.viewMode");
              nextMode = parsed.mode;
            }
          } catch {
            if (stored === "graph" || stored === "list") {
              window.sessionStorage.removeItem("vertexOverview.viewMode");
              nextMode = stored as OverviewViewMode;
            }
          }
        }
      }
    }
    setViewMode(nextMode);
  }, [
    props.variant,
    itemsProps?.vertex?.id,
    itemsProps?.vertex?.items_behavior?.display,
    resolveViewMode,
  ]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (matchesShortcut(event, viewGridShortcut)) {
        event.preventDefault();
        setViewMode("grid");
        return;
      }
      if (matchesShortcut(event, viewListShortcut)) {
        event.preventDefault();
        setViewMode("list");
        return;
      }
      if (matchesShortcut(event, viewGraphShortcut)) {
        event.preventDefault();
        setViewMode("graph");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewGridShortcut, viewListShortcut, viewGraphShortcut]);

  const itemsFabRef = React.useRef<CreateFabHandle | null>(null);
  const projectsFabRef = React.useRef<CreateFabHandle | null>(null);

  const itemsState = useItemsOverview({
    props: itemsProps,
    t,
    createShortcut,
    fabRef: itemsFabRef,
  });

  const projectsState = useProjectsOverview({
    props: projectsProps,
    t,
    createShortcut,
    prevShortcut,
    nextShortcut,
    fabRef: projectsFabRef,
  });

  const detachedState = useDetachedOverview({
    props: detachedProps,
    t,
  });

  const [orderMap, setOrderMap] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (itemsProps) {
      const layout = itemsProps.vertex.items_layout;
      if (layout?.mode === "linear") {
        setOrderMap(layout.order ?? {});
        return;
      }
      setOrderMap({});
      return;
    }
    if (!orderKey || typeof window === "undefined") {
      setOrderMap({});
      return;
    }
    const stored = window.sessionStorage.getItem(orderKey);
    if (!stored) {
      setOrderMap({});
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Record<string, number>;
      setOrderMap(parsed ?? {});
    } catch {
      setOrderMap({});
    }
  }, [itemsProps, itemsProps?.vertex.id, itemsProps?.vertex.items_layout, orderKey]);

  const gridItems: VertexItem[] = itemsProps
    ? itemsState.items
    : projectsProps
      ? projectsProps.items
      : detachedState.vertexItems;

  const orderedItems = React.useMemo(
    () => sortItems(gridItems, orderMap),
    [gridItems, orderMap]
  );

  React.useEffect(() => {
    let active = true;
    const loadCounts = async () => {
      if (orderedItems.length === 0) {
        setCountsByVertexId({});
        return;
      }
      try {
        const fs = await getFileSystem();
        const results = await Promise.all(
          orderedItems.map(async (item) => {
            try {
              const [notes, images, links, children] = await Promise.all([
                fs.listNotes(item.vertex),
                fs.listImages(item.vertex),
                fs.listLinks(item.vertex),
                item.vertex.is_leaf
                  ? Promise.resolve([])
                  : fs.getVertices(item.vertex.id),
              ]);
              let filesCount = 0;
              try {
                const { isTauri } = await import("@tauri-apps/api/core");
                if (await isTauri()) {
                  const { readDir } = await import("@tauri-apps/plugin-fs");
                  const entries = await readDir(item.vertex.asset_directory);
                  filesCount = entries.filter((entry) => {
                    const name = entry.name ?? "";
                    if (!name || name.startsWith(".")) return false;
                    const ext = name.split(".").pop()?.toLowerCase() ?? "";
                    if (["json", "md"].includes(ext)) return false;
                    if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "svg"].includes(ext)) {
                      return false;
                    }
                    return true;
                  }).length;
                }
              } catch {
                filesCount = 0;
              }
              return [
                item.vertex.id,
                {
                  items: item.vertex.is_leaf ? 0 : children.length,
                  notes: notes.length,
                  images: images.length,
                  urls: links.length,
                  files: filesCount,
                },
              ] as const;
            } catch {
              return null;
            }
          })
        );
        if (!active) return;
        const next: Record<string, VertexItemCounts> = {};
        results.forEach((entry) => {
          if (!entry) return;
          next[entry[0]] = entry[1];
        });
        setCountsByVertexId(next);
      } catch {
        if (!active) return;
        setCountsByVertexId({});
      }
    };
    loadCounts();
    return () => {
      active = false;
    };
  }, [orderedItems]);

  const itemsWithCounts = React.useMemo(
    () =>
      orderedItems.map((item) => ({
        ...item,
        counts: countsByVertexId[item.vertex.id],
      })),
    [countsByVertexId, orderedItems]
  );

  const gridEmpty =
    (itemsProps && itemsState.items.length === 0) ||
    (projectsProps && projectsProps.items.length === 0) ||
    (detachedProps && detachedState.vertexItems.length === 0);

  const handleGridSelect = (id: string) => {
    if (itemsProps) {
      itemsProps.onOpenVertex?.(id);
      return;
    }
    if (projectsProps) {
      projectsProps.onOpenVertex(id);
      return;
    }
    if (detachedProps) {
      const target = detachedState.detachedById.get(id);
      if (target) detachedState.setAssociateTarget(target);
    }
  };

  const handleGridDelete = (vertex: Vertex) => {
    if (itemsProps) {
      const match = itemsState.items.find((c) => c.vertex.id === vertex.id);
      if (match) itemsState.setConfirmDelete(match);
      return;
    }
    if (projectsProps) {
      const match = projectsProps.items.find((it) => it.vertex.id === vertex.id);
      if (match) projectsState.setConfirmDelete(match);
    }
  };

  const handleOpenPath = React.useCallback(
    async (path?: string | null) => {
      if (!path) return;
      try {
        const { isTauri, invoke } = await import("@tauri-apps/api/core");
        if (isTauri()) {
          await invoke("fs_open_path", { path });
          return;
        }
        window.open(encodeURI(`file://${path}`), "_blank", "noreferrer");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to open folder.";
        if (itemsProps) {
          itemsState.setError(message);
        } else if (projectsProps) {
          projectsState.setError(message);
        } else if (detachedProps) {
          detachedState.setError(message);
        }
      }
    },
    [detachedProps, itemsProps, projectsProps, itemsState, projectsState, detachedState]
  );

  const persistItemsOrder = React.useCallback(
    async (nextOrder: Record<string, number>) => {
      if (!itemsProps) return;
      try {
        const fs = await getFileSystem();
        const updated: Vertex = {
          ...itemsProps.vertex,
          items_layout: { mode: "linear", order: nextOrder },
          updated_at: new Date().toISOString(),
        };
        await fs.updateVertex(updated);
        await itemsProps.onVertexUpdated?.(updated);
      } catch (err) {
        itemsState.setError(
          err instanceof Error ? err.message : t("itemsTab.errors.update")
        );
      }
    },
    [itemsProps, itemsState, t]
  );

  const handleReorder = React.useCallback(
    (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;
      const nextItems = moveItem(orderedItems, sourceId, targetId);
      const nextOrder = buildOrderMap(nextItems);
      setOrderMap(nextOrder);
      if (itemsProps) {
        void persistItemsOrder(nextOrder);
      } else if (orderKey && typeof window !== "undefined") {
        window.sessionStorage.setItem(orderKey, JSON.stringify(nextOrder));
      }
    },
    [itemsProps, orderKey, orderedItems, persistItemsOrder]
  );

  const renderOverlay = detachedProps
    ? (item: VertexItem) => {
        const target = detachedState.detachedById.get(item.vertex.id);
        if (!target) return null;
        return (
          <VertexRowActions
            openLabel={t("detachedTab.openFolder")}
            deleteLabel={t("commonActions.delete")}
            onOpenFolder={() => handleOpenPath(target.path)}
            onDelete={() => detachedState.setDeleteTarget(target)}
          />
        );
      }
    : (item: VertexItem) => (
        <VertexRowActions
          openLabel={t("detachedTab.openFolder")}
          deleteLabel={t("commonActions.delete")}
          disableOpen={!item.vertex.asset_directory}
          onOpenFolder={() => handleOpenPath(item.vertex.asset_directory)}
          onDelete={() => handleGridDelete(item.vertex)}
        />
      );

  const headerLeft = itemsProps ? (
    <ItemsHeader
      labelDraft={itemsState.labelDraft}
      editingLabel={itemsState.editingLabel}
      labelSaving={itemsState.labelSaving}
      labelInputRef={itemsState.labelInputRef}
      onChangeLabel={itemsState.setLabelDraft}
      onEditToggle={itemsState.setEditingLabel}
      onCommit={itemsState.commitLabel}
      onCancel={() => itemsState.setLabelDraft(itemsProps.label)}
    />
  ) : projectsProps ? (
    <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
      {projectsProps.title ?? t("projects.title")}
    </Typography>
  ) : (
    <Box sx={{ mb: 1 }}>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
        {t("detachedTab.title")}
      </Typography>
      <Typography color="text.secondary">{t("detachedTab.subtitle")}</Typography>
    </Box>
  );

  const header = (
    <Box
      sx={{
        display: "flex",
        alignItems: itemsProps ? "center" : "flex-start",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>{headerLeft}</Box>
      <ViewModeTabs value={viewMode} onChange={setViewMode} />
    </Box>
  );

  const emptyState = itemsProps ? (
    <Box
      sx={{
        flex: 1,
        minHeight: 240,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography color="text.secondary" align="center">
        {t("itemsTab.empty", { kind: itemsState.emptyLabel })}
      </Typography>
    </Box>
  ) : projectsProps ? (
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
    <Box
      sx={{
        flex: 1,
        minHeight: 260,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mt: 2,
      }}
    >
      <Typography color="text.secondary" align="center">
        {t("detachedTab.empty")}
      </Typography>
    </Box>
  );

  const loadingState = itemsProps ? (
    <Typography color="text.secondary">{t("itemsTab.loading")}</Typography>
  ) : (
    <Typography color="text.secondary" sx={{ mt: 3 }}>
      {t("detachedTab.loading")}
    </Typography>
  );

  const graphOpenVertex = itemsProps?.onOpenVertex ?? projectsProps?.onOpenVertex;

  const contentView = viewMode === "grid" ? (
    <VertexGrid
      items={itemsWithCounts}
      selectedVertexId={null}
      onSelect={handleGridSelect}
      onDeleteVertex={detachedProps ? undefined : handleGridDelete}
      renderOverlay={renderOverlay}
      scrollY={itemsProps ? true : undefined}
      showWorkspaceLabel={!itemsProps}
      onReorder={handleReorder}
      dragLabel={t("commonActions.reorder")}
    />
  ) : viewMode === "list" ? (
    <VertexListView
      items={itemsWithCounts}
      onSelect={handleGridSelect}
      onDeleteVertex={detachedProps ? undefined : handleGridDelete}
      renderActions={renderOverlay}
      showWorkspaceLabel={!itemsProps}
      onReorder={handleReorder}
      dragLabel={t("commonActions.reorder")}
    />
  ) : (
    <GraphView
      items={itemsWithCounts}
      currentVertex={itemsProps?.vertex ?? null}
      currentWorkspace={itemsProps?.workspace ?? null}
      onOpenVertex={graphOpenVertex}
      onVertexUpdated={itemsProps?.onVertexUpdated}
    />
  );

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pt: 6.5,
        minHeight: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: itemsProps ? "hidden" : "visible",
      }}
      onMouseDown={projectsProps ? (e) => e.stopPropagation() : undefined}
    >
      <Box
        sx={
          {
            px: 2,
            pb: 2,
            pt: 2,
            display: "flex",
            flexDirection: "column",
            gap: itemsProps ? 1 : 1.5,
            flex: 1,
            minHeight: 0,
          }
        }
      >
        {header}

        {itemsProps && itemsState.error && (
          <Typography color="error" variant="body2">
            {itemsState.error}
          </Typography>
        )}
        {detachedProps && detachedState.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {detachedState.error}
          </Alert>
        )}

        {(itemsProps && itemsState.loading) ||
        (detachedProps && detachedState.loading) ? (
          loadingState
        ) : viewMode !== "graph" && gridEmpty ? (
          emptyState
        ) : (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            {contentView}
          </Box>
        )}
      </Box>

      {itemsProps && (
        <CreateFab
          ref={itemsFabRef}
          onClick={() => {
            itemsState.setCreateOpen(true);
          }}
          title={t("itemsTab.create")}
          sx={{ position: "absolute", bottom: 20, right: 20 }}
        />
      )}

      {projectsProps && (
        <CreateFab
          ref={projectsFabRef}
          onClick={(e) => {
            if (projectsProps.workspaces.length === 1) {
              projectsState.handleCreateProjectInWorkspace(
                projectsProps.workspaces[0]
              );
              return;
            }
            projectsState.setFabAnchor(e.currentTarget);
          }}
          title={t("projects.create")}
          sx={{ position: "absolute", bottom: 20, right: 20 }}
        />
      )}

      {itemsProps && (
        <ItemsDialogs
          createOpen={itemsState.createOpen}
          createError={itemsState.createError}
          confirmDelete={itemsState.confirmDelete}
          onCloseCreate={() => {
            itemsState.setCreateOpen(false);
            itemsState.setCreateError(null);
          }}
          onSubmitCreate={itemsState.createItem}
          onCancelDelete={() => itemsState.setConfirmDelete(null)}
          onConfirmDelete={async () => {
            if (!itemsState.confirmDelete) return;
            await itemsState.deleteItem(itemsState.confirmDelete);
          }}
        />
      )}

      {projectsProps && (
        <ProjectsDialogs
          editorOpen={projectsState.editorOpen}
          error={projectsState.error}
          confirmDelete={projectsState.confirmDelete}
          workspaceLabel={projectsState.selectedWorkspace?.name}
          onCloseCreate={() => {
            projectsState.setEditorOpen(false);
            projectsState.setSelectedWorkspace(null);
            projectsState.setError(null);
          }}
          onSubmitCreate={projectsState.handleCreateProject}
          onCancelDelete={() => projectsState.setConfirmDelete(null)}
          onConfirmDelete={() => {
            if (projectsState.confirmDelete) {
              projectsProps.onDeleteProject(projectsState.confirmDelete.vertex.id);
            }
            projectsState.setConfirmDelete(null);
          }}
        />
      )}

      {projectsProps && (
        <ProjectsWorkspacePopover
          anchorEl={projectsState.fabAnchor}
          workspaces={projectsState.filteredWorkspaces}
          workspaceQuery={projectsState.workspaceQuery}
          activeWorkspaceIndex={projectsState.activeWorkspaceIndex}
          onClose={() => projectsState.setFabAnchor(null)}
          onQueryChange={projectsState.setWorkspaceQuery}
          onKeyDown={projectsState.handleWorkspaceKeyDown}
          onSelectWorkspace={projectsState.handleCreateProjectInWorkspace}
          onHoverWorkspace={(ws) =>
            projectsState.setActiveWorkspaceIndex(
              projectsState.filteredWorkspaces.findIndex(
                (entry) => entry.id === ws.id
              )
            )
          }
        />
      )}

      {detachedProps && (
        <DetachedDialogs
          associateTarget={detachedState.associateTarget}
          createTarget={detachedState.createTarget}
          deleteTarget={detachedState.deleteTarget}
          createError={detachedState.createError}
          onCloseAssociate={() => detachedState.setAssociateTarget(null)}
          onCreateFromAssociate={() => {
            detachedState.setCreateTarget(detachedState.associateTarget);
            detachedState.setAssociateTarget(null);
          }}
          onCloseCreate={() => {
            detachedState.setCreateTarget(null);
            detachedState.setCreateError(null);
          }}
          onSubmitCreate={detachedState.handleCreateFromDetached}
          onCancelDelete={() => detachedState.setDeleteTarget(null)}
          onConfirmDelete={async () => {
            if (!detachedState.deleteTarget) return;
            const target = detachedState.deleteTarget;
            detachedState.setDeleteTarget(null);
            await detachedState.handleDeleteDetached(target);
          }}
        />
      )}
    </Box>
  );
};
