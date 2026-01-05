import * as React from "react";
import { Box, Typography } from "@mui/material";

export const ReferencesTab: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        Vertex references
      </Typography>
      <Typography color="text.secondary">
        References of type <code>vertex</code> grouped by reference group.
      </Typography>
    </Box>
  );
};
