import * as React from "react";
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import ViewModuleOutlinedIcon from "@mui/icons-material/ViewModuleOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import { useTranslation } from "react-i18next";

import type { OverviewViewMode } from "../types";

type ViewModeTabsProps = {
  value: OverviewViewMode;
  onChange: (value: OverviewViewMode) => void;
};

export const ViewModeTabs: React.FC<ViewModeTabsProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation("common");
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      size="small"
      onChange={(_, next) => {
        if (next) onChange(next as OverviewViewMode);
      }}
      aria-label={t("vertexOverview.viewModes.label")}
    >
      <ToggleButton
        value="grid"
        aria-label={t("vertexOverview.viewModes.grid")}
      >
        <Tooltip title={t("vertexOverview.viewModes.grid")} placement="bottom">
          <ViewModuleOutlinedIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
      <ToggleButton
        value="list"
        aria-label={t("vertexOverview.viewModes.list")}
      >
        <Tooltip title={t("vertexOverview.viewModes.list")} placement="bottom">
          <ViewListOutlinedIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
      <ToggleButton
        value="graph"
        aria-label={t("vertexOverview.viewModes.graph")}
      >
        <Tooltip title={t("vertexOverview.viewModes.graph")} placement="bottom">
          <HubOutlinedIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
};
