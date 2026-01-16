import * as React from "react";
import { Box, Typography, Stack, Link } from "@mui/material";
import { APP_NAME, GITHUB_URL, LICENSE_URL } from "@/constants/appConstants";
import { useTranslation } from "react-i18next";

export const Footer: React.FC = () => {
  const { t } = useTranslation("common");
  const year = new Date().getFullYear();
  const openExternal = React.useCallback(async (url: string) => {
    try {
      const { isTauri, invoke } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        await invoke("open_external_url", { url });
        return;
      }
    } catch {
      // fall back to browser navigation
    }
    window.open(url, "_blank", "noreferrer");
  }, []);

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
            component="button"
            type="button"
            onClick={() => void openExternal(GITHUB_URL)}
            underline="hover"
            color="text.secondary"
          >
            {t("footer.github")}
          </Link>

          <Link
            component="button"
            type="button"
            onClick={() => void openExternal(LICENSE_URL)}
            underline="hover"
            color="text.secondary"
          >
            {t("footer.license")}
          </Link>
        </Stack>
      </Stack>
    </Box>
  );
};
