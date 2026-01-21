import * as React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Box,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { SearchOutlined } from "@mui/icons-material";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import { useNavigate } from "react-router-dom";

import { APP_NAME } from "@/constants/appConstants";
import { useThemeMode } from "@/utils/themes/hooks/useThemeMode";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { SearchDialog } from "./search-dialog/SearchDialog";
import { SettingsDialog } from "./settings-dialog/SettingsDialog";
import { useTranslation } from "react-i18next";
import packageJson from "../../../../package.json";

type HeaderProps = {
  splitEnabled?: boolean;
  onToggleSplit?: () => void;
};

export const Header: React.FC<HeaderProps> = ({
  splitEnabled = false,
  onToggleSplit,
}) => {
  const { t } = useTranslation("common");
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
          <Typography variant="caption" color="text.secondary">
            v{packageJson.version}
          </Typography>
        </Box>

        <Tooltip title={t("header.splitScreen")}>
          <span>
            <IconButton
              aria-label={t("header.splitScreen")}
              onClick={onToggleSplit}
              disabled={!onToggleSplit}
              sx={(theme) => ({
                color: splitEnabled
                  ? theme.palette.primary.main
                  : theme.palette.mode === "light"
                    ? theme.palette.text.secondary
                    : theme.palette.text.primary,
                borderRadius: 2,
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                  color: splitEnabled
                    ? theme.palette.primary.main
                    : theme.palette.text.primary,
                },
              })}
            >
              <VerticalSplitIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t("header.search")}>
          <IconButton
            aria-label={t("header.search")}
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
        <Tooltip title={t("header.settings")}>
          <IconButton
            onClick={() => setSettingsOpen(true)}
            aria-label={t("header.settings")}
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
