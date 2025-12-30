import { createContext } from "react";
import { ThemePreference } from "./themePreference";

type ThemeModeContextValue = {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
};

export const ThemeModeContext = createContext<
  ThemeModeContextValue | undefined
>(undefined);
