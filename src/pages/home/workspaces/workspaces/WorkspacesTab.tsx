import * as React from "react";
import { Box, Paper, Typography } from "@mui/material";

import type { Workspace } from "@/core/workspace";

type WorkspacesTabProps = {
  workspaces: Workspace[];
};

export const WorkspacesTab: React.FC<WorkspacesTabProps> = ({
  workspaces,
}) => {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pt: 6.5,
        overflow: "auto",
        p: 2,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        Workspaces
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Manage your workspaces here (create, rename, remove, change path).
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
              <Typography sx={{ fontWeight: 800 }}>{ws.name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
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
  );
};
