import * as React from "react";
import { Box, Typography } from "@mui/material";
import type { VertexItem } from "../../../vertices/vertex-grid/VertexGrid";

type TimelineViewProps = {
  items: VertexItem[];
};

export const TimelineView: React.FC<TimelineViewProps> = ({ items }) => (
  <Box
    sx={{
      minHeight: 200,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    data-testid="vertex-overview-timeline"
  >
    <Typography color="text.secondary">
      Timeline view coming soon ({items.length} items)
    </Typography>
  </Box>
);
