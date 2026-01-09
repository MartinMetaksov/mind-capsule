import * as React from "react";
import { AppBar, Toolbar, Typography, IconButton, Tooltip, Box } from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { SearchOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import { APP_NAME } from "@/constants/appConstants";
import { useThemeMode } from "@/utils/themes/hooks/useThemeMode";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { SearchDialog } from "./SearchDialog";
import { SettingsDialog } from "./SettingsDialog";

export const Header: React.FC = () => {
  const { preference, setPreference } = useThemeMode();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const navigate = useNavigate();
  const os = React.useMemo(() => detectOperatingSystem(), []);

  React.useEffect(() => {
    const shortcuts = {
      search: getShortcut("openSearch", os),
      settings: getShortcut("openSettings", os),
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (matchesShortcut(event, shortcuts.search)) {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (matchesShortcut(event, shortcuts.settings)) {
        event.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [os]);

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar
        sx={{
          minHeight: 64,
          gap: 2,
        }}
      >
        <Box
          role="button"
          aria-label={`${APP_NAME} home`}
          onClick={() => navigate("/")}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flex: 1,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <Box
            component="img"
            src="/images/logo.png"
            alt="Mind Capsule logo"
            sx={{
              width: 32,
              height: 32,
              userSelect: "none",
            }}
          />

          <Typography
            variant="h6"
            color="text.primary"
            component="h1"
            sx={{ fontWeight: 800 }}
          >
            {APP_NAME}
          </Typography>
        </Box>

        <Tooltip title="Search">
          <IconButton
            aria-label="open search menu"
            onClick={() => setSearchOpen(true)}
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
            })}
          >
            <SearchOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title="Settings">
          <IconButton
            onClick={() => setSettingsOpen(true)}
            aria-label="open settings"
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
            })}
          >
            <SettingsOutlinedIcon />
          </IconButton>
        </Tooltip>

        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          preference={preference}
          onChangePreference={setPreference}
        />
      </Toolbar>
    </AppBar>
  );
};
