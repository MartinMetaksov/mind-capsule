import * as React from "react";
import { Box, Typography } from "@mui/material";
import type { VertexItem } from "../../../vertices/vertex-grid/VertexGrid";

type GraphViewProps = {
  items: VertexItem[];
};

export const GraphView: React.FC<GraphViewProps> = ({ items }) => (
  <Box
    sx={{
      minHeight: 200,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    data-testid="vertex-overview-graph"
  >
    <Typography color="text.secondary">
      Graph view coming soon ({items.length} items)
    </Typography>
  </Box>
);
