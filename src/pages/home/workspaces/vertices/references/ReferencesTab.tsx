import * as React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export const ReferencesTab: React.FC = () => {
  const { t } = useTranslation("common");
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        {t("referencesTab.title")}
      </Typography>
      <Typography color="text.secondary">
        {t("referencesTab.description")}
      </Typography>
    </Box>
  );
};
