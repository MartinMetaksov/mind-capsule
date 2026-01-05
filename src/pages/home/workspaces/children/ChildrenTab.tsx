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

import { VertexGrid, VertexItem } from "../vertices/VertexGrid";
import { CreateVertexFab } from "../components/CreateVertexFab";
import type { Workspace } from "@/core/workspace";

type ChildrenTabProps = {
  items: VertexItem[];
  workspaces: Workspace[];
  onOpenVertex: (vertexId: string) => void;
  onCreateVertexInWorkspace: (workspace: Workspace) => void;
};

export const ChildrenTab: React.FC<ChildrenTabProps> = ({
  items,
  workspaces,
  onOpenVertex,
  onCreateVertexInWorkspace,
}) => {
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
    if (!q) return workspaces;
    return workspaces.filter((ws) => ws.name.toLowerCase().includes(q));
  }, [workspaces, workspaceQuery]);

  const handleCreateVertexInWorkspace = (ws: Workspace) => {
    onCreateVertexInWorkspace(ws);
    closePopover();
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
      <VertexGrid
        items={items}
        selectedVertexId={null}
        onSelect={(id) => onOpenVertex(id)}
        onDeselect={() => {}}
        onOpenChildren={undefined}
        onOpenReferences={undefined}
      />

      <CreateVertexFab onClick={openPopover} />

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
  );
};
