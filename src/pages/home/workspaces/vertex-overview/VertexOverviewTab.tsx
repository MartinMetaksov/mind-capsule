import * as React from "react";
import { Alert, Box, Typography } from "@mui/material";

import { VertexGrid, VertexItem } from "../vertices/vertex-grid/VertexGrid";
import {
  CreateFab,
  type CreateFabHandle,
} from "../components/create-fab/CreateFab";
import type { Vertex } from "@/core/vertex";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut } from "@/utils/shortcuts";
import { useTranslation } from "react-i18next";

import { ItemsHeader } from "./components/ItemsHeader";
import { ItemsDialogs } from "./components/ItemsDialogs";
import { ProjectsDialogs } from "./components/ProjectsDialogs";
import { ProjectsWorkspacePopover } from "./components/ProjectsWorkspacePopover";
import { DetachedDialogs } from "./components/DetachedDialogs";
import { DetachedOverlayActions } from "./components/DetachedOverlayActions";
import { ViewModeTabs } from "./components/ViewModeTabs";
import { useItemsOverview } from "./hooks/useItemsOverview";
import { useProjectsOverview } from "./hooks/useProjectsOverview";
import { useDetachedOverview } from "./hooks/useDetachedOverview";
import type {
  OverviewViewMode,
  VertexOverviewTabProps,
} from "./types";
import { VertexListView } from "./views/list/VertexListView";
import { TimelineView } from "./views/timeline/TimelineView";
import { GraphView } from "./views/graph/GraphView";

export { type VertexOverviewTabProps } from "./types";

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

  const itemsProps = props.variant === "items" ? props : null;
  const projectsProps = props.variant === "projects" ? props : null;
  const detachedProps = props.variant === "detached" ? props : null;

  const resolveViewMode = React.useCallback(
    (display?: string): OverviewViewMode => {
      if (display === "list") return "list";
      if (display === "timeline") return "timeline";
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

  React.useEffect(() => {
    if (props.variant === "items") {
      setViewMode(resolveViewMode(itemsProps?.vertex?.items_behavior?.display));
      return;
    }
    setViewMode("grid");
  }, [props.variant, itemsProps?.vertex?.items_behavior?.display, resolveViewMode]);

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

  const gridItems: VertexItem[] = itemsProps
    ? itemsState.items
    : projectsProps
      ? projectsProps.items
      : detachedState.vertexItems;

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

  const renderOverlay = detachedProps
    ? (item: VertexItem) => {
        const target = detachedState.detachedById.get(item.vertex.id);
        if (!target) return null;
        return (
          <DetachedOverlayActions
            openLabel={t("detachedTab.openFolder")}
            deleteLabel={t("commonActions.delete")}
            onOpenFolder={() => detachedState.handleOpenFolder(target.path)}
            onDelete={() => detachedState.setDeleteTarget(target)}
          />
        );
      }
    : undefined;

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
      {projectsProps.title ?? "Projects"}
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

  const contentView = viewMode === "grid" ? (
    <VertexGrid
      items={gridItems}
      selectedVertexId={null}
      onSelect={handleGridSelect}
      onDeleteVertex={detachedProps ? undefined : handleGridDelete}
      renderOverlay={renderOverlay}
      scrollY={itemsProps ? true : undefined}
      showWorkspaceLabel={!itemsProps}
    />
  ) : viewMode === "list" ? (
    <VertexListView
      items={gridItems}
      onSelect={handleGridSelect}
      onDeleteVertex={detachedProps ? undefined : handleGridDelete}
      renderActions={renderOverlay}
      showWorkspaceLabel={!itemsProps}
    />
  ) : viewMode === "timeline" ? (
    <TimelineView items={gridItems} />
  ) : (
    <GraphView items={gridItems} />
  );

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pt: 6.5,
        minHeight: 0,
        overflow: itemsProps ? "hidden" : "visible",
      }}
      onMouseDown={projectsProps ? (e) => e.stopPropagation() : undefined}
    >
      <Box
        sx={
          itemsProps
            ? {
                px: 2,
                pb: 2,
                pt: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }
            : { px: 2, pb: 2, pt: 2 }
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
        ) : gridEmpty ? (
          emptyState
        ) : (
          <Box
            sx={
              itemsProps ? { flex: 1, minHeight: 0 } : { minHeight: 0 }
            }
          >
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
          onClick={(e) => projectsState.setFabAnchor(e.currentTarget)}
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
