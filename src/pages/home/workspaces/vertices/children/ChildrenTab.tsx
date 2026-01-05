import * as React from "react";
import { Box, Typography } from "@mui/material";

type ChildrenTabProps = {
  label: string;
};

export const ChildrenTab: React.FC<ChildrenTabProps> = ({ label }) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        {label}
      </Typography>
      <Typography color="text.secondary">
        Child vertices will be shown here (row/canvas view).
      </Typography>
    </Box>
  );
};
