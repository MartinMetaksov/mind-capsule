import * as React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { Vertex } from "@/core/vertex";

type FilesTabProps = {
  vertex: Vertex;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
};

export const FilesTab: React.FC<FilesTabProps> = () => {
  const { t } = useTranslation("common");
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        maxWidth: 760,
        mx: "auto",
        width: "100%",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        {t("filesTab.title")}
      </Typography>
      <Typography color="text.secondary">
        {t("filesTab.description")}
      </Typography>
    </Box>
  );
};
