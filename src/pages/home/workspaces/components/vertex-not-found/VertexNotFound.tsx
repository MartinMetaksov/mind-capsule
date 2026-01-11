import * as React from "react";
import { Box, Typography } from "@mui/material";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import { useTranslation } from "react-i18next";

type VertexNotFoundProps = {
  missingId: string;
  onBack: () => void;
};

export const VertexNotFound: React.FC<VertexNotFoundProps> = ({
  missingId,
  onBack,
}) => {
  const { t } = useTranslation("common");
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
            {t("vertexNotFound.title")}
          </Typography>
        </Box>
        <Typography color="text.secondary">
          {t("vertexNotFound.subtitle")} <code>{missingId}</code>
        </Typography>
        <Typography color="primary" sx={{ cursor: "pointer" }} onClick={onBack}>
          {t("vertexNotFound.back")}
        </Typography>
      </Box>
    </Box>
  );
};
