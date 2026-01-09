import * as React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export const FilesTab: React.FC = () => {
  const { t } = useTranslation("common");

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        {t("filesTab.title")}
      </Typography>
      <Typography color="text.secondary">
        {t("filesTab.description")}
      </Typography>
    </Box>
  );
};
