import { Box, CircularProgress } from "@mui/material";

export const Loading: React.FC = () => {
  return (
    <Box
      sx={{ display: "flex", justifyContent: "center", m: "auto", mt: "100px" }}
    >
      <CircularProgress color="primary" />
    </Box>
  );
};
