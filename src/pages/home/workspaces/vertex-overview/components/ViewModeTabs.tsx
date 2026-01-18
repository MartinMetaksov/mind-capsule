import * as React from "react";
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import ViewModuleOutlinedIcon from "@mui/icons-material/ViewModuleOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";

import type { OverviewViewMode } from "../types";

type ViewModeTabsProps = {
  value: OverviewViewMode;
  onChange: (value: OverviewViewMode) => void;
};

export const ViewModeTabs: React.FC<ViewModeTabsProps> = ({
  value,
  onChange,
}) => (
  <ToggleButtonGroup
    exclusive
    value={value}
    size="small"
    onChange={(_, next) => {
      if (next) onChange(next as OverviewViewMode);
    }}
    aria-label="View mode"
  >
    <ToggleButton value="grid" aria-label="Grid view">
      <Tooltip title="Grid view" placement="bottom">
        <ViewModuleOutlinedIcon fontSize="small" />
      </Tooltip>
    </ToggleButton>
    <ToggleButton value="list" aria-label="List view">
      <Tooltip title="List view" placement="bottom">
        <ViewListOutlinedIcon fontSize="small" />
      </Tooltip>
    </ToggleButton>
    <ToggleButton value="timeline" aria-label="Timeline view">
      <Tooltip title="Timeline view" placement="bottom">
        <TimelineOutlinedIcon fontSize="small" />
      </Tooltip>
    </ToggleButton>
    <ToggleButton value="graph" aria-label="Graph view">
      <Tooltip title="Graph view" placement="bottom">
        <HubOutlinedIcon fontSize="small" />
      </Tooltip>
    </ToggleButton>
  </ToggleButtonGroup>
);
