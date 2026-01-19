import * as React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import CenterFocusStrongOutlinedIcon from "@mui/icons-material/CenterFocusStrongOutlined";
import { useTranslation } from "react-i18next";

type GraphRecenterButtonProps = {
  visible: boolean;
  onClick: () => void;
};

export const GraphRecenterButton: React.FC<GraphRecenterButtonProps> = ({
  visible,
  onClick,
}) => {
  const { t } = useTranslation("common");
  if (!visible) return null;
  return (
    <Box
      sx={{
        position: "absolute",
        right: 16,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 3,
      }}
    >
      <Tooltip title={t("graphView.recenter")} placement="left">
        <IconButton
          size="small"
          sx={{ bgcolor: "background.paper" }}
          onClick={onClick}
          aria-label={t("graphView.recenter")}
        >
          <CenterFocusStrongOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
