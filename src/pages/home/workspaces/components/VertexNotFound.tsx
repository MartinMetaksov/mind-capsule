import * as React from "react";
import { Box, Typography } from "@mui/material";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";

type VertexNotFoundProps = {
  missingId: string;
  onBack: () => void;
};

export const VertexNotFound: React.FC<VertexNotFoundProps> = ({
  missingId,
  onBack,
}) => {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ErrorOutlineOutlinedIcon color="error" />
          <Typography variant="h6" color="error">
            Vertex not found
          </Typography>
        </Box>
        <Typography color="text.secondary">
          No vertex exists for id: <code>{missingId}</code>
        </Typography>
        <Typography color="primary" sx={{ cursor: "pointer" }} onClick={onBack}>
          Go back to projects
        </Typography>
      </Box>
    </Box>
  );
};
