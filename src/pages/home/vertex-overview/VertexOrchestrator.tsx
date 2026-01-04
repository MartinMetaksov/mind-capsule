import * as React from "react";
import {
  Box,
  Breadcrumbs,
  Chip,
  Divider,
  Link,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
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

  // later: drill further by opening a referenced vertex
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
            }}
          >
            <Tab
              value="children"
              icon={<AccountTreeOutlinedIcon />}
              iconPosition="top"
              label="Children"
            />
            <Tab
              value="details"
              icon={<InfoOutlinedIcon />}
              iconPosition="top"
              label="Details"
            />
            <Tab
              value="vertex_refs"
              icon={<HubOutlinedIcon />}
              iconPosition="top"
              label="Vertices"
            />
            <Tab
              value="urls"
              icon={<LinkOutlinedIcon />}
              iconPosition="top"
              label="Links"
            />
            <Tab
              value="images"
              icon={<ImageOutlinedIcon />}
              iconPosition="top"
              label="Images"
            />
            <Tab
              value="files"
              icon={<InsertDriveFileOutlinedIcon />}
              iconPosition="top"
              label="Files"
            />
            <Tab
              value="comments"
              icon={<CommentOutlinedIcon />}
              iconPosition="top"
              label="Notes"
            />
          </Tabs>
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
          {/* Breadcrumb bar (fixed) */}
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
              <Link
                component="button"
                onClick={onBackToRoot}
                underline="hover"
                color="inherit"
                style={{ fontWeight: 800 }}
              >
                Workspaces
              </Link>

              {trail.map((t, idx) => {
                const isLast = idx === trail.length - 1;
                if (isLast) {
                  return (
                    <Typography
                      key={t.vertex.id}
                      color="text.primary"
                      sx={{ fontWeight: 900 }}
                    >
                      {t.vertex.title}
                    </Typography>
                  );
                }

                return (
                  <Link
                    key={t.vertex.id}
                    component="button"
                    onClick={() => onJumpTo(idx)}
                    underline="hover"
                    color="inherit"
                    style={{ fontWeight: 800 }}
                    title={t.workspace.name}
                  >
                    {t.vertex.title}
                  </Link>
                );
              })}
            </Breadcrumbs>
          </Box>

          {/* Scrollable content area (single padding source) */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pt: "52px", // matches breadcrumb bar height (approx)
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
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                    Children
                  </Typography>
                  <Typography color="text.secondary">
                    Child vertices will be shown here (row/canvas view).
                  </Typography>
                </Box>
              )}

              {tab === "details" && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                    Details
                  </Typography>

                  <Typography color="text.secondary">
                    Basic information about this vertex.
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}
                  >
                    <Typography sx={{ fontWeight: 900 }}>
                      {vertex.title}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Workspace: <strong>{workspace.name}</strong>
                    </Typography>

                    {vertex.short_description && (
                      <Typography variant="body2">
                        {vertex.short_description}
                      </Typography>
                    )}

                    {vertex.long_description && (
                      <Typography variant="body2" color="text.secondary">
                        {vertex.long_description}
                      </Typography>
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    <Chip
                      size="small"
                      label={`Children: ${vertex.children_ids?.length ?? 0}`}
                      variant="outlined"
                      color={hasChildren ? "primary" : "default"}
                    />
                    <Chip
                      size="small"
                      label={`Vertex refs: ${refCounts.vertex}`}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`Links: ${refCounts.url}`}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`Images: ${refCounts.image}`}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`Files: ${refCounts.file}`}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`Notes: ${refCounts.comment}`}
                      variant="outlined"
                    />
                  </Box>
                </Box>
              )}

              {tab === "vertex_refs" && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                    Vertex references
                  </Typography>
                  <Typography color="text.secondary">
                    References of type <code>vertex</code> grouped by reference
                    group.
                  </Typography>
                </Box>
              )}

              {tab === "urls" && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                    Links
                  </Typography>
                  <Typography color="text.secondary">
                    References of type <code>url</code>.
                  </Typography>
                </Box>
              )}

              {tab === "images" && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                    Images
                  </Typography>
                  <Typography color="text.secondary">
                    References of type <code>image</code>.
                  </Typography>
                </Box>
              )}

              {tab === "files" && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                    Files
                  </Typography>
                  <Typography color="text.secondary">
                    References of type <code>file</code>.
                  </Typography>
                </Box>
              )}

              {tab === "comments" && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                    Notes
                  </Typography>
                  <Typography color="text.secondary">
                    References of type <code>comment</code> (soon renamed to
                    notes).
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
