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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { ThemePreference } from "@/utils/themes/themePreference";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut } from "@/utils/shortcuts";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import KeyboardAltOutlinedIcon from "@mui/icons-material/KeyboardAltOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import i18n from "i18next";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");
  const [tab, setTab] = React.useState<"theme" | "shortcuts" | "language">("theme");
  const [language, setLanguage] = React.useState(() => i18n.resolvedLanguage?.split("-")[0] || "en");
  const os = React.useMemo(() => detectOperatingSystem(), []);

  const shortcutList = React.useMemo(
    () => [
      { label: t("shortcuts.search"), key: getShortcut("openSearch", os).display },
      { label: t("shortcuts.settings"), key: getShortcut("openSettings", os).display },
      { label: t("shortcuts.create"), key: getShortcut("createVertex", os).display },
      { label: t("shortcuts.tab", { number: 1 }), key: getShortcut("tab1", os).display },
      { label: t("shortcuts.tab", { number: 2 }), key: getShortcut("tab2", os).display },
      { label: t("shortcuts.tab", { number: 3 }), key: getShortcut("tab3", os).display },
      { label: t("shortcuts.tab", { number: 4 }), key: getShortcut("tab4", os).display },
      { label: t("shortcuts.tab", { number: 5 }), key: getShortcut("tab5", os).display },
      { label: t("shortcuts.tab", { number: 6 }), key: getShortcut("tab6", os).display },
      { label: t("shortcuts.confirmDelete"), key: getShortcut("confirmDelete", os).display },
      { label: t("shortcuts.cancelDelete"), key: getShortcut("cancelDelete", os).display },
      { label: t("shortcuts.imagePrev"), key: getShortcut("imagePrev", os).display },
      { label: t("shortcuts.imageNext"), key: getShortcut("imageNext", os).display },
    ],
    [os, t]
  );

  React.useEffect(() => {
    const handler = (lng: string) => setLanguage(lng.split("-")[0]);
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            minHeight: "60vh",
            maxHeight: "70vh",
            height: "70vh",
          },
        },
      }}
    >
      <DialogTitle>{t("settings.title")}</DialogTitle>
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
                  alignItems: "center",
                  justifyContent: "flex-start",
                  textAlign: "left",
                  minHeight: 36,
                  py: 0.75,
                  gap: 1,
                  "& .MuiTab-wrapper": {
                    justifyContent: "flex-start",
                    alignItems: "center",
                    gap: 0.75,
                    display: "inline-flex",
                  },
                  "& .MuiTab-iconWrapper": {
                    display: "inline-flex",
                    alignItems: "center",
                  },
                },
              }}
            >
              <Tab
                value="theme"
                icon={<SettingsOutlinedIcon fontSize="small" />}
                iconPosition="start"
                label={t("settings.theme")}
              />
              <Tab
                value="shortcuts"
                icon={<KeyboardAltOutlinedIcon fontSize="small" />}
                iconPosition="start"
                label={t("settings.shortcuts")}
              />
              <Tab
                value="language"
                icon={<LanguageOutlinedIcon fontSize="small" />}
                iconPosition="start"
                label={t("settings.language")}
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
                  {t("settings.theme")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("settings.themeDescription")}
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={preference}
                  onChange={(_, val) => val && onChangePreference(val)}
                  size="small"
                >
                  <ToggleButton value="system">{t("settings.themeAuto")}</ToggleButton>
                  <ToggleButton value="light">{t("settings.themeLight")}</ToggleButton>
                  <ToggleButton value="dark">{t("settings.themeDark")}</ToggleButton>
                </ToggleButtonGroup>
              </>
            )}

            {tab === "shortcuts" && (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t("settings.shortcuts")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("settings.shortcutsDescription")}
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

            {tab === "language" && (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t("settings.language")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("settings.languageDescription")}
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel id="language-select-label">{t("settings.language")}</InputLabel>
                  <Select
                    labelId="language-select-label"
                    label={t("settings.language")}
                    value={language}
                    onChange={(e) => {
                      const next = (e.target.value as string) || "en";
                      setLanguage(next);
                      void i18n.changeLanguage(next);
                    }}
                  >
                    <MenuItem value="en">{t("languages.en")}</MenuItem>
                    <MenuItem value="bg">{t("languages.bg")}</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
