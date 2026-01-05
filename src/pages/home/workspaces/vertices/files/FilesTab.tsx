import * as React from "react";
import { Box, Typography } from "@mui/material";

export const FilesTab: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        Files
      </Typography>
      <Typography color="text.secondary">
        References of type <code>file</code>.
      </Typography>
    </Box>
  );
};
