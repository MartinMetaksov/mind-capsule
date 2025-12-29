import { Box } from "@mui/material";
import React from "react";

export const Header: React.FC = () => {
  return (
    <Box
      sx={{
        width: "100%",
        padding: "10px 50px",
      }}
    >
      <h1>Story Master</h1>
    </Box>
  );
};
