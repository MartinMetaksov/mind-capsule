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
import { BreadcrumbsTrail } from "../components/BreadcrumbsTrail";
import { VerticalTabs } from "../components/VerticalTabs";
import { ChildrenTab } from "./children/ChildrenTab";
import { PropertiesTab } from "./properties/PropertiesTab";
import { TagsTab } from "./tags/TagsTab";
import { LinksTab } from "./links/LinksTab";
import { ImagesTab } from "./images/ImagesTab";
import { NotesTab } from "./notes/NotesTab";

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

type RefCounts = Record<Reference["type"], number>;

function countReferences(vertex: Vertex): RefCounts {
  const counts: RefCounts = {
    vertex: 0,
    url: 0,
    image: 0,
    file: 0,
    note: 0,
  };
  for (const r of vertex.references ?? []) counts[r.type] += 1;
  return counts;
}

function pluralize(word: string): string {
  const lower = word.toLowerCase();
  if (lower.endsWith("s") || lower.endsWith("x") || lower.endsWith("z")) {
    return `${word}es`;
  }
  if (lower.endsWith("ch") || lower.endsWith("sh")) {
    return `${word}es`;
  }
  const penultimate = lower[lower.length - 2];
  if (lower.endsWith("y") && penultimate && !"aeiou".includes(penultimate)) {
    return `${word.slice(0, -1)}ies`;
  }
  return `${word}s`;
}

function formatChildLabel(behavior: Vertex["children_behavior"]): string {
  if (!behavior?.child_kind) return "Children";
  const raw = behavior.child_kind.startsWith("custom:")
    ? behavior.child_kind.slice("custom:".length) || "custom"
    : behavior.child_kind;
  const plural = pluralize(raw);
  return plural.charAt(0).toUpperCase() + plural.slice(1);
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
  const tabOrder: VertexTab[] = React.useMemo(
    () => [
      "children",
      "properties",
      "tags",
      "notes",
      "images",
      "urls",
      // "files",
      // "references",
    ],
    []
  );

  const resolveInitialTab = React.useCallback((): VertexTab => {
    const candidate = vertex.default_tab as VertexTabId | undefined;
    return tabOrder.includes(candidate as VertexTab)
      ? (candidate as VertexTab)
      : "children";
  }, [tabOrder, vertex.default_tab]);

  const [tab, setTab] = React.useState<VertexTab>(() => resolveInitialTab());

  const refCounts = React.useMemo(() => countReferences(vertex), [vertex]);
  const hasChildren = false;
  const childrenLabel = React.useMemo(
    () => formatChildLabel(vertex.children_behavior),
    [vertex.children_behavior]
  );
  const handleOpenVertex = React.useCallback(
    (id: string) => {
      onOpenVertex?.(id);
    },
    [onOpenVertex]
  );
  const vertexTabs = React.useMemo(
    () => [
      {
        value: "children" as const,
        label: childrenLabel,
        icon: <AccountTreeOutlinedIcon />,
      },
      {
        value: "properties" as const,
        label: "Properties",
        icon: <TuneOutlined />,
      },
      { value: "tags" as const, label: "Tags", icon: <TagOutlinedIcon /> },
      {
        value: "notes" as const,
        label: "Notes",
        icon: <CommentOutlinedIcon />,
      },
      {
        value: "images" as const,
        label: "Images",
        icon: <ImageOutlinedIcon />,
      },
      { value: "urls" as const, label: "Links", icon: <LinkOutlinedIcon /> },
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
    [childrenLabel]
  );

  React.useEffect(() => {
    setTab(resolveInitialTab());
  }, [resolveInitialTab, vertex.id]);
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
          <VerticalTabs value={tab} onChange={setTab} items={vertexTabs} />
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
              {tab === "children" && (
                <ChildrenTab
                  label={childrenLabel}
                  vertex={vertex}
                  workspace={workspace}
                  onOpenVertex={handleOpenVertex}
                />
              )}

              {tab === "properties" && (
                <PropertiesTab
                  vertex={vertex}
                  workspace={workspace}
                  hasChildren={hasChildren}
                  refCounts={refCounts}
                  onVertexUpdated={onVertexUpdated}
                  onSelectTab={(nextTab) =>
                    setTab((nextTab as VertexTab) ?? "children")
                  }
                />
              )}

              {tab === "tags" && <TagsTab tags={vertex.tags ?? []} />}

              {tab === "notes" && <NotesTab />}

              {tab === "images" && <ImagesTab />}

              {tab === "urls" && <LinksTab />}

              {/* {tab === "files" && <FilesTab />}

              {tab === "references" && <ReferencesTab />} */}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
