import * as React from "react";
import { Box, Chip, Divider, Typography } from "@mui/material";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";

type RefCounts = {
  vertex: number;
  url: number;
  image: number;
  file: number;
  comment: number;
};

type DetailsTabProps = {
  vertex: Vertex;
  workspace: Workspace;
  hasChildren: boolean;
  refCounts: RefCounts;
};

export const DetailsTab: React.FC<DetailsTabProps> = ({
  vertex,
  workspace,
  hasChildren,
  refCounts,
}) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        Details
      </Typography>

      <Typography color="text.secondary">
        Basic information about this vertex.
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography sx={{ fontWeight: 900 }}>{vertex.title}</Typography>

        <Typography variant="body2" color="text.secondary">
          Workspace: <strong>{workspace.name}</strong>
        </Typography>

        {vertex.short_description && (
          <Typography variant="body2">{vertex.short_description}</Typography>
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
  );
};
