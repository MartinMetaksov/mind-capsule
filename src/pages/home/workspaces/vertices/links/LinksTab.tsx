import * as React from "react";
import { Box, Typography } from "@mui/material";

export const LinksTab: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        Links
      </Typography>
      <Typography color="text.secondary">
        References of type <code>url</code>.
      </Typography>
    </Box>
  );
};
