import * as React from "react";
import { Box, Chip, Divider, Typography } from "@mui/material";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";

type RefCounts = {
  vertex: number;
  url: number;
  image: number;
  file: number;
  note: number;
};

type PropertiesTabProps = {
  vertex: Vertex;
  workspace: Workspace;
  hasChildren: boolean;
  refCounts: RefCounts;
};

export const PropertiesTab: React.FC<PropertiesTabProps> = ({
  vertex,
  workspace,
  hasChildren,
  refCounts,
}) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        Properties
      </Typography>

      <Typography color="text.secondary">
        Manage the core properties for this vertex.
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography sx={{ fontWeight: 900 }}>{vertex.title}</Typography>

        <Typography variant="body2" color="text.secondary">
          Workspace: <strong>{workspace.name}</strong>
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Chip
          size="small"
          label={`Children: 0`}
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
          label={`Notes: ${refCounts.note}`}
          variant="outlined"
        />
      </Box>
    </Box>
  );
};
