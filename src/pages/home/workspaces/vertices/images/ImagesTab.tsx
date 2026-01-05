import * as React from "react";
import { Box, Typography } from "@mui/material";

export const ImagesTab: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        Images
      </Typography>
      <Typography color="text.secondary">
        References of type <code>image</code>.
      </Typography>
    </Box>
  );
};
