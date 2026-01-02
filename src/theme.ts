// theme.ts
import { createTheme, ThemeOptions, alpha } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

/**
 * Writing-focused theme
 * Calm, readable, distraction-free
 */

/* ----------------------------------------------
   COLOR CONSTANTS
---------------------------------------------- */

// Light: parchment + ink
const LIGHT_BG = "#F6F0E6";
const LIGHT_PAPER = "#FFFBF3";
const LIGHT_PAPER_2 = "#F1E7D8";
const LIGHT_TEXT = "#201A14";
const LIGHT_TEXT_MUTED = "#5B5147";
const LIGHT_PRIMARY = "#7A3E1D";
const LIGHT_SECONDARY = "#2B6A6B";
const LIGHT_INFO = "#3A6EA5";
const LIGHT_SUCCESS = "#2E7D32";
const LIGHT_WARNING = "#B35C00";
const LIGHT_ERROR = "#C62828";

// Dark: ink + candlelight
const DARK_BG = "#0E0B10";
const DARK_PAPER = "#17121B";
const DARK_PAPER_2 = "#201A25";
const DARK_TEXT = "#F2E9DD";
const DARK_TEXT_MUTED = "#C8BBA9";
const DARK_PRIMARY = "#E0A463";
const DARK_SECONDARY = "#7BC4B5";
const DARK_INFO = "#86AEE0";
const DARK_SUCCESS = "#4CC38A";
const DARK_WARNING = "#F2B35C";
const DARK_ERROR = "#FF6B6B";

/* ----------------------------------------------
   THEME TOKENS
---------------------------------------------- */
const getDesignTokens = (mode: PaletteMode): ThemeOptions => {
  const isDark = mode === "dark";

  const bg = isDark ? DARK_BG : LIGHT_BG;
  const paper = isDark ? DARK_PAPER : LIGHT_PAPER;
  const paper2 = isDark ? DARK_PAPER_2 : LIGHT_PAPER_2;

  const textPrimary = isDark ? DARK_TEXT : LIGHT_TEXT;
  const textSecondary = isDark ? DARK_TEXT_MUTED : LIGHT_TEXT_MUTED;

  const primary = isDark ? DARK_PRIMARY : LIGHT_PRIMARY;
  const secondary = isDark ? DARK_SECONDARY : LIGHT_SECONDARY;

  return {
    palette: {
      mode,
      primary: { main: primary },
      secondary: { main: secondary },
      info: { main: isDark ? DARK_INFO : LIGHT_INFO },
      success: { main: isDark ? DARK_SUCCESS : LIGHT_SUCCESS },
      warning: { main: isDark ? DARK_WARNING : LIGHT_WARNING },
      error: { main: isDark ? DARK_ERROR : LIGHT_ERROR },
      background: {
        default: bg,
        paper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider: isDark ? "rgba(242, 233, 221, 0.10)" : "rgba(32, 26, 20, 0.12)",
    },

    shape: {
      borderRadius: 14,
    },

    typography: {
      fontFamily:
        "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",

      h1: { fontWeight: 800, letterSpacing: "-0.02em" },
      h2: { fontWeight: 800, letterSpacing: "-0.02em" },
      h3: { fontWeight: 750 },
      h4: { fontWeight: 750 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },

      body1: { lineHeight: 1.6 },
      body2: { fontSize: "0.92rem", lineHeight: 1.55 },

      button: { textTransform: "none", fontWeight: 650 },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            margin: 0,
            backgroundColor: bg,
            color: textPrimary,
          },
          a: {
            color: "inherit",
            textDecoration: "none",
          },
          "::selection": {
            background: alpha(primary, isDark ? 0.35 : 0.25),
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${alpha(
              isDark ? DARK_TEXT : LIGHT_TEXT,
              isDark ? 0.08 : 0.1
            )}`,
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${alpha(
              isDark ? DARK_TEXT : LIGHT_TEXT,
              isDark ? 0.08 : 0.1
            )}`,
            boxShadow: isDark
              ? "0 8px 24px rgba(0,0,0,0.4)"
              : "0 8px 24px rgba(32,26,20,0.08)",
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: paper,
            backgroundImage: "none",
            boxShadow: "none",
            borderBottom: `1px solid ${alpha(
              isDark ? DARK_TEXT : LIGHT_TEXT,
              isDark ? 0.08 : 0.1
            )}`,
          },
        },
      },

      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
          contained: {
            boxShadow: "none",
            "&:hover": {
              boxShadow: "none",
            },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: alpha(paper2, isDark ? 0.4 : 0.6),
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: primary,
              borderWidth: 2,
            },
          },
          notchedOutline: {
            borderColor: alpha(isDark ? DARK_TEXT : LIGHT_TEXT, 0.18),
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            backgroundColor: alpha(primary, isDark ? 0.12 : 0.08),
            border: `1px solid ${alpha(primary, isDark ? 0.28 : 0.22)}`,
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 10,
            backgroundColor: isDark ? "#0B0910" : "#241D16",
          },
        },
      },
    },
  };
};

/* ----------------------------------------------
   PUBLIC API
---------------------------------------------- */
export const createAppTheme = (mode: PaletteMode) =>
  createTheme(getDesignTokens(mode));
