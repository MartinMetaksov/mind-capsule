import * as React from "react";
import { Box, Typography } from "@mui/material";

export const NotesTab: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        Notes
      </Typography>
      <Typography color="text.secondary">
        References of type <code>comment</code> (soon renamed to notes).
      </Typography>
    </Box>
  );
};
