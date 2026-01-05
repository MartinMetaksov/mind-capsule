import * as React from "react";
import { Box } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import type { Reference } from "@/core/common/reference";
import { BreadcrumbsTrail } from "../components/BreadcrumbsTrail";
import { VerticalTabs } from "../components/VerticalTabs";
import { ChildrenTab } from "./children/ChildrenTab";
import { DetailsTab } from "./details/DetailsTab";
import { ReferencesTab } from "./references/ReferencesTab";
import { LinksTab } from "./links/LinksTab";
import { ImagesTab } from "./images/ImagesTab";
import { FilesTab } from "./files/FilesTab";
import { NotesTab } from "./notes/NotesTab";

type VertexTab =
  | "children"
  | "details"
  | "vertex_refs"
  | "urls"
  | "images"
  | "files"
  | "comments";

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
};

type RefCounts = Record<Reference["type"], number>;

function countReferences(vertex: Vertex): RefCounts {
  const counts: RefCounts = {
    vertex: 0,
    url: 0,
    image: 0,
    file: 0,
    comment: 0,
  };
  for (const g of vertex.reference_groups ?? []) {
    for (const r of g.references) counts[r.type] += 1;
  }
  return counts;
}

const vertexTabs = [
  {
    value: "children" as const,
    label: "Children",
    icon: <AccountTreeOutlinedIcon />,
  },
  {
    value: "details" as const,
    label: "Details",
    icon: <InfoOutlinedIcon />,
  },
  {
    value: "vertex_refs" as const,
    label: "Vertices",
    icon: <HubOutlinedIcon />,
  },
  {
    value: "urls" as const,
    label: "Links",
    icon: <LinkOutlinedIcon />,
  },
  {
    value: "images" as const,
    label: "Images",
    icon: <ImageOutlinedIcon />,
  },
  {
    value: "files" as const,
    label: "Files",
    icon: <InsertDriveFileOutlinedIcon />,
  },
  {
    value: "comments" as const,
    label: "Notes",
    icon: <CommentOutlinedIcon />,
  },
];

export const VertexOrchestrator: React.FC<VertexOrchestratorProps> = ({
  vertex,
  workspace,
  trail,
  onJumpTo,
  onBackToRoot,
}) => {
  const [tab, setTab] = React.useState<VertexTab>("children");

  const refCounts = React.useMemo(() => countReferences(vertex), [vertex]);
  const hasChildren = (vertex.children_ids?.length ?? 0) > 0;
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
      }}
    >
      {/* Two-pane layout */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {/* LEFT TAB RAIL */}
        <Box
          sx={(theme) => ({
            width: 110,
            flexShrink: 0,
            alignSelf: "stretch",
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            py: 1,
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
              {tab === "children" && <ChildrenTab />}

              {tab === "details" && (
                <DetailsTab
                  vertex={vertex}
                  workspace={workspace}
                  hasChildren={hasChildren}
                  refCounts={refCounts}
                />
              )}

              {tab === "vertex_refs" && <ReferencesTab />}

              {tab === "urls" && <LinksTab />}

              {tab === "images" && <ImagesTab />}

              {tab === "files" && <FilesTab />}

              {tab === "comments" && <NotesTab />}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
