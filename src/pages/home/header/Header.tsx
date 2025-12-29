import * as React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Box,
  Divider,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import BrightnessAutoOutlinedIcon from "@mui/icons-material/BrightnessAutoOutlined";
import { ThemePreference, useThemeMode } from "../../../utils/ThemeModeContext";

export const Header: React.FC = () => {
  const { preference, setPreference } = useThemeMode();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const selectTheme = (next: ThemePreference) => {
    setPreference(next);
    handleClose();
  };

  const modeLabel =
    preference === "system"
      ? "Auto"
      : preference === "light"
        ? "Light"
        : "Dark";

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar
        sx={{
          px: { xs: 2, sm: 4, md: 6 },
          minHeight: 64,
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flex: 1 }}>
          <Typography
            variant="h6"
            color="text.primary"
            component="h1"
            sx={{ fontWeight: 800 }}
          >
            Story Master
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {modeLabel}
          </Typography>
        </Box>

        <Tooltip title="Settings">
          <IconButton
            onClick={handleOpen}
            aria-label="open settings menu"
            aria-controls={open ? "settings-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
            sx={(theme) => ({
              color:
                theme.palette.mode === "light"
                  ? theme.palette.text.secondary
                  : theme.palette.text.primary,

              borderRadius: 2,

              "&:hover": {
                backgroundColor: theme.palette.action.hover,
                color:
                  theme.palette.mode === "light"
                    ? theme.palette.text.primary
                    : theme.palette.text.primary,
              },

              ...(open && {
                backgroundColor: theme.palette.action.selected,
                color: theme.palette.text.primary,
              }),
            })}
          >
            <SettingsOutlinedIcon />
          </IconButton>
        </Tooltip>

        <Menu
          id="settings-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            list: {
              dense: true,
              "aria-label": "settings",
            },
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ px: 2, py: 1, display: "block" }}
          >
            Theme
          </Typography>
          <Divider />

          <MenuItem
            selected={preference === "system"}
            onClick={() => selectTheme("system")}
          >
            <ListItemIcon>
              <BrightnessAutoOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Auto (system)" />
          </MenuItem>

          <MenuItem
            selected={preference === "light"}
            onClick={() => selectTheme("light")}
          >
            <ListItemIcon>
              <LightModeOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Light" />
          </MenuItem>

          <MenuItem
            selected={preference === "dark"}
            onClick={() => selectTheme("dark")}
          >
            <ListItemIcon>
              <DarkModeOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Dark" />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
