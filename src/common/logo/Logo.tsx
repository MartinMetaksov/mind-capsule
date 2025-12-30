import { Box } from "@mui/material";
import React from "react";

type LogoProps = {
  width?: number;
  alt?: string;
};

export const Logo: React.FC<LogoProps> = ({
  width = 180,
  alt = "Story Master logo",
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        mb: 1,
      }}
    >
      <Box
        component="img"
        src="/images/1024x1024.png"
        alt={alt}
        sx={{
          width,
          height: "auto",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </Box>
  );
};
