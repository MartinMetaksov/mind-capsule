import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Box,
  Tabs,
  Tab,
  Divider,
  Stack,
} from "@mui/material";
import { ThemePreference } from "@/utils/themes/themePreference";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut } from "@/utils/shortcuts";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import KeyboardAltOutlinedIcon from "@mui/icons-material/KeyboardAltOutlined";

type Props = {
  open: boolean;
  onClose: () => void;
  preference: ThemePreference;
  onChangePreference: (val: ThemePreference) => void;
};

export const SettingsDialog: React.FC<Props> = ({
  open,
  onClose,
  preference,
  onChangePreference,
}) => {
  const [tab, setTab] = React.useState<"theme" | "shortcuts">("theme");
  const os = React.useMemo(() => detectOperatingSystem(), []);

  const shortcutList = React.useMemo(
    () => [
      { label: "Search", key: getShortcut("openSearch", os).display },
      { label: "Open Settings", key: getShortcut("openSettings", os).display },
      { label: "Create", key: getShortcut("createVertex", os).display },
      { label: "Tab 1", key: getShortcut("tab1", os).display },
      { label: "Tab 2", key: getShortcut("tab2", os).display },
      { label: "Tab 3", key: getShortcut("tab3", os).display },
      { label: "Tab 4", key: getShortcut("tab4", os).display },
      { label: "Tab 5", key: getShortcut("tab5", os).display },
      { label: "Tab 6", key: getShortcut("tab6", os).display },
      { label: "Confirm delete", key: getShortcut("confirmDelete", os).display },
      { label: "Cancel delete", key: getShortcut("cancelDelete", os).display },
    ],
    [os]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          minHeight: "60vh",
          maxHeight: "70vh",
          height: "70vh",
        },
      }}
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent sx={{ pt: 1, overflow: "hidden", height: "100%" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "210px 1fr" },
            columnGap: 2,
            rowGap: 0,
            height: "100%",
            minHeight: "50vh",
          }}
        >
          <Box
            sx={{
              minWidth: { xs: 150, sm: 200 },
              borderRight: (theme) => `1px solid ${theme.palette.divider}`,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              maxHeight: "58vh",
            }}
          >
            <Tabs
              orientation="vertical"
              value={tab}
              onChange={(_, val) => setTab(val)}
              variant="scrollable"
              sx={{
                "& .MuiTabs-indicator": {
                  left: 0,
                  right: "auto",
                },
                "& .MuiTab-root": {
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  textAlign: "left",
                  minHeight: 36,
                  py: 0.75,
                  gap: 1,
                  "& .MuiTab-wrapper": {
                    justifyContent: "flex-start",
                    alignItems: "center",
                    gap: 0.75,
                  },
                },
              }}
            >
              <Tab
                value="theme"
                icon={<SettingsOutlinedIcon fontSize="small" />}
                iconPosition="start"
                label="Theme"
              />
              <Tab
                value="shortcuts"
                icon={<KeyboardAltOutlinedIcon fontSize="small" />}
                iconPosition="start"
                label="Keyboard shortcuts"
              />
            </Tabs>
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              overflowY: "auto",
              pr: 1,
              maxHeight: "58vh",
            }}
          >
            {tab === "theme" && (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Theme
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose how the app looks.
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={preference}
                  onChange={(_, val) => val && onChangePreference(val)}
                  size="small"
                >
                  <ToggleButton value="system">Auto</ToggleButton>
                  <ToggleButton value="light">Light</ToggleButton>
                  <ToggleButton value="dark">Dark</ToggleButton>
                </ToggleButtonGroup>
              </>
            )}

            {tab === "shortcuts" && (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Keyboard shortcuts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Shortcuts adapt to your operating system and are read-only.
                </Typography>
                <Divider />
                <Stack spacing={1.25}>
                  {shortcutList.map((s) => (
                    <Box
                      key={s.label}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {s.label}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          border: (theme) => `1px solid ${theme.palette.divider}`,
                          fontWeight: 600,
                        }}
                      >
                        {s.key}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
