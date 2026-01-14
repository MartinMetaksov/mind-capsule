import * as React from "react";
import { Box } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";
import TagOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import { TuneOutlined } from "@mui/icons-material";
import type { Vertex, VertexTabId } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import type { Reference } from "@/core/common/reference";
import { BreadcrumbsTrail } from "../components/breadcrumbs-trail/BreadcrumbsTrail";
import { VerticalTabs } from "../components/vertical-tabs/VerticalTabs";
import { ChildrenTab } from "./children/ChildrenTab";
import { PropertiesTab } from "./properties/PropertiesTab";
import { TagsTab } from "./tags/TagsTab";
import { LinksTab } from "./links/LinksTab";
import { ImagesTab } from "./images/ImagesTab";
import { NotesTab } from "./notes/NotesTab";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type VertexTab =
  | "children"
  | "properties"
  | "tags"
  | "notes"
  | "images"
  | "urls";
// | "files"
// | "references"

type TrailItem = {
  vertex: Vertex;
  workspace: Workspace;
};

export type VertexOrchestratorProps = {
  vertex: Vertex;
  workspace: Workspace;

  trail: TrailItem[];
  onJumpTo: (index: number) => void;
  onBackToRoot: () => void;

  onOpenVertex?: (vertexId: string) => void;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
};

function formatChildLabel(behavior: Vertex["children_behavior"]): string {
  if (!behavior?.child_kind) return "Items";
  const raw = behavior.child_kind.startsWith("custom:")
    ? behavior.child_kind.slice("custom:".length) || "custom"
    : behavior.child_kind;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export const VertexOrchestrator: React.FC<VertexOrchestratorProps> = ({
  vertex,
  workspace,
  trail,
  onJumpTo,
  onBackToRoot,
  onOpenVertex,
  onVertexUpdated,
}) => {
  const { t } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const [currentVertex, setCurrentVertex] = React.useState<Vertex>(vertex);
  const [references, setReferences] = React.useState<Reference[]>([]);
  const os = React.useMemo(() => detectOperatingSystem(), []);

  React.useEffect(() => {
    setCurrentVertex(vertex);
    setReferences([]);
  }, [vertex]);

  const tabOrder: VertexTab[] = React.useMemo(() => {
    const base: VertexTab[] = [
      "children",
      "properties",
      "tags",
      "notes",
      "images",
      "urls",
      // "files",
      // "references",
    ];
    return vertex.is_leaf ? base.filter((t) => t !== "children") : base;
  }, [vertex.is_leaf]);

  const resolveInitialTab = React.useCallback((): VertexTab => {
    const candidate = currentVertex.default_tab as VertexTabId | undefined;
    const fallback = currentVertex.is_leaf ? "properties" : "children";
    return tabOrder.includes(candidate as VertexTab)
      ? (candidate as VertexTab)
      : (fallback as VertexTab);
  }, [tabOrder, currentVertex.default_tab, currentVertex.is_leaf]);

  const [tab, setTab] = React.useState<VertexTab>(() => resolveInitialTab());
  const hasChildren = false;
  const childrenLabel = React.useMemo(
    () => formatChildLabel(currentVertex.children_behavior),
    [currentVertex.children_behavior]
  );
  const handleOpenVertex = React.useCallback(
    (id: string) => {
      onOpenVertex?.(id);
    },
    [onOpenVertex]
  );
  const vertexTabs = React.useMemo(
    () => [
      ...(!currentVertex.is_leaf
        ? [
            {
              value: "children" as const,
              label: childrenLabel,
              icon: <AccountTreeOutlinedIcon />,
            },
          ]
        : []),
      {
        value: "properties" as const,
        label: t("vertex.tabs.properties"),
        icon: <TuneOutlined />,
      },
      { value: "tags" as const, label: t("vertex.tabs.tags"), icon: <TagOutlinedIcon /> },
      {
        value: "notes" as const,
        label: t("vertex.tabs.notes"),
        icon: <CommentOutlinedIcon />,
      },
      {
        value: "images" as const,
        label: t("vertex.tabs.images"),
        icon: <ImageOutlinedIcon />,
      },
      { value: "urls" as const, label: t("vertex.tabs.links"), icon: <LinkOutlinedIcon /> },
      // {
      //   value: "files" as const,
      //   label: "Files",
      //   icon: <InsertDriveFileOutlinedIcon />,
      // },
      // {
      //   value: "references" as const,
      //   label: "References",
      //   icon: <HubOutlinedIcon />,
      // },
    ],
    [childrenLabel, currentVertex.is_leaf, t]
  );
  const availableTabValues = React.useMemo(
    () => vertexTabs.map((t) => t.value),
    [vertexTabs]
  );

  const resolveToAvailable = React.useCallback(
    (preferred?: VertexTabId | null): VertexTab => {
      if (preferred && availableTabValues.includes(preferred as VertexTab)) {
        return preferred as VertexTab;
      }
      return availableTabValues[0] ?? "properties";
    },
    [availableTabValues]
  );

  const safeTab = React.useMemo(() => resolveToAvailable(tab), [resolveToAvailable, tab]);

  React.useEffect(() => {
    setTab(resolveToAvailable(resolveInitialTab()));
  }, [currentVertex.id, resolveInitialTab, resolveToAvailable]);

  // Apply tab query param once (then strip it)
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryTab = params.get("tab") as VertexTabId | null;
    if (!queryTab) {
      return;
    }
    params.delete("tab");
    setTab(resolveToAvailable(queryTab));
    navigate(
      { pathname: location.pathname, search: params.toString() },
      { replace: true }
    );
  }, [availableTabValues, location.pathname, location.search, navigate, resolveToAvailable]);

  React.useEffect(() => {
    const shortcuts = [
      getShortcut("tab1", os),
      getShortcut("tab2", os),
      getShortcut("tab3", os),
      getShortcut("tab4", os),
      getShortcut("tab5", os),
      getShortcut("tab6", os),
    ];

    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut, idx) => {
        if (matchesShortcut(event, shortcut) && availableTabValues[idx]) {
          event.preventDefault();
          setTab(availableTabValues[idx] as VertexTab);
        }
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [availableTabValues, os]);
  const breadcrumbItems = React.useMemo(
    () =>
      trail.map((t, idx) => {
        const isLast = idx === trail.length - 1;
        return {
          id: t.vertex.id,
          label: t.vertex.title,
          title: t.workspace.name,
          onClick: isLast ? undefined : () => onJumpTo(idx),
        };
      }),
    [onJumpTo, trail]
  );

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
      {/* Two-pane layout */}
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
        <Box
          sx={(theme) => ({
            width: 110,
            flexShrink: 0,
            alignSelf: "stretch",
            height: "100%",
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            py: 0,
            overflow: "hidden",
          })}
        >
          <VerticalTabs value={safeTab} onChange={setTab} items={vertexTabs} />
        </Box>

        {/* MAIN CANVAS */}
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
          <BreadcrumbsTrail
            rootLabel="Workspaces"
            onRootClick={onBackToRoot}
            items={breadcrumbItems}
          />

          {/* Scrollable content area (single padding source) */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pt: "52px",
              overflow: "auto",
            }}
          >
            {/* Inner canvas padding */}
            <Box
              sx={{
                p: 2,
                minHeight: "100%",
              }}
            >
              {/* TAB CONTENTS (no big rounded wrapper) */}
              {safeTab === "children" && (
                <ChildrenTab
                  label={childrenLabel}
                  vertex={currentVertex}
                  workspace={workspace}
                  onOpenVertex={handleOpenVertex}
                />
              )}

              {safeTab === "properties" && (
                <PropertiesTab
                  vertex={currentVertex}
                  workspace={workspace}
                  hasChildren={hasChildren}
                  onVertexUpdated={(v) => {
                    setCurrentVertex(v);
                    return onVertexUpdated?.(v);
                  }}
                  onSelectTab={(nextTab) =>
                    setTab((nextTab as VertexTab) ?? "children")
                  }
                />
              )}

              {safeTab === "tags" && (
                <TagsTab
                  vertex={currentVertex}
                  onVertexUpdated={(v) => {
                    setCurrentVertex(v);
                    return onVertexUpdated?.(v);
                  }}
                />
              )}

              {safeTab === "notes" && (
                <NotesTab
                  vertex={currentVertex}
                />
              )}

              {safeTab === "images" && (
                <ImagesTab
                  vertex={currentVertex}
                />
              )}

              {safeTab === "urls" && (
                <LinksTab
                  vertex={currentVertex}
                  references={references}
                  onReferencesUpdated={(next) => setReferences(next)}
                />
              )}

              {/* {tab === "files" && <FilesTab />}

              {tab === "references" && <ReferencesTab />} */}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
