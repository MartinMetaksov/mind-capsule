import * as React from "react";
import { Box, Typography, Stack, Link } from "@mui/material";

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={(theme) => ({
        mt: "50px",
        py: 3,
        px: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
      })}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
      >
        <Typography variant="body2" color="text.secondary">
          © {year} Story Master
        </Typography>

        <Stack direction="row" spacing={2}>
          <Link
            href="https://github.com/MartinMetaksov/story-master"
            underline="hover"
            color="text.secondary"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </Link>

          <Link
            href="#"
            underline="hover"
            color="text.secondary"
            onClick={(e) => e.preventDefault()}
          >
            License
          </Link>
        </Stack>
      </Stack>
    </Box>
  );
};