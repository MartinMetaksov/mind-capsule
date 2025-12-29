import { Box, CircularProgress } from "@mui/material";

export const Loading: React.FC = () => {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", m: "auto" }}>
      <CircularProgress color="secondary" />
    </Box>
  );
};
