import React, { createContext, useContext, useMemo, useState } from "react";
import {
  PaletteMode,
  ThemeProvider,
  CssBaseline,
  useMediaQuery,
} from "@mui/material";
import { createAppTheme } from "../theme";

type ThemePreference = "light" | "dark" | "system";

type ThemeModeContextValue = {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(
  undefined,
);

export const useThemeMode = () => {
  const ctx = useContext(ThemeModeContext);
  if (!ctx)
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  return ctx;
};

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [preference, setPreference] = useState<ThemePreference>("system");

  const mode: PaletteMode =
    preference === "system" ? (prefersDark ? "dark" : "light") : preference;

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const value = useMemo(() => ({ preference, setPreference }), [preference]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline>{children}</CssBaseline>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};
