import * as React from "react";
import { Box, Typography, Stack, Link } from "@mui/material";
import { APP_NAME, GITHUB_URL, LICENSE_URL } from "@/constants/appConstants";

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={(theme) => ({
        py: 3,
        px: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
      })}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent={{ xs: "center", sm: "space-between" }}
        alignItems={{ xs: "center", sm: "center" }}
        textAlign={{ xs: "center", sm: "left" }}
      >
        <Typography variant="body2" color="text.secondary">
          © {year} {APP_NAME}
        </Typography>

        <Stack
          direction="row"
          spacing={2}
          justifyContent={{ xs: "center", sm: "flex-start" }}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <Link
            href={GITHUB_URL}
            underline="hover"
            color="text.secondary"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </Link>

          <Link
            href={LICENSE_URL}
            underline="hover"
            color="text.secondary"
            target="_blank"
            rel="noreferrer"
          >
            License
          </Link>
        </Stack>
      </Stack>
    </Box>
  );
};
