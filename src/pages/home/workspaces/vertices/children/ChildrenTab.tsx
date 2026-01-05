import * as React from "react";
import { Box, Typography } from "@mui/material";

export const ChildrenTab: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        Children
      </Typography>
      <Typography color="text.secondary">
        Child vertices will be shown here (row/canvas view).
      </Typography>
    </Box>
  );
};
