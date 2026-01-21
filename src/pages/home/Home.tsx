import { Box } from "@mui/material";
import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./header/Header";
import { Footer } from "./footer/Footer";
import { SplitGraphPanel } from "./SplitGraphPanel";

export const Home: React.FC = () => {
  const [splitEnabled, setSplitEnabled] = React.useState(false);

  return (
    <Box
      data-split={splitEnabled ? "true" : "false"}
      sx={{
        minHeight: "100vh",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        "&[data-split='true'] [data-create-fab='true'][data-fab-position='fixed']":
          {
            transform: "translateX(-50vw)",
          },
      }}
    >
      <Header
        splitEnabled={splitEnabled}
        onToggleSplit={() => setSplitEnabled((prev) => !prev)}
      />

      <Box
        component="main"
        sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <Outlet />
        </Box>
        <Box
          sx={(theme) => ({
            flexBasis: splitEnabled ? "50%" : 0,
            maxWidth: splitEnabled ? "50%" : 0,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            overflow: "hidden",
            borderLeft: splitEnabled ? `1px solid ${theme.palette.divider}` : "none",
            opacity: splitEnabled ? 1 : 0,
            transform: splitEnabled ? "translateX(0)" : "translateX(100%)",
            transition:
              "flex-basis 220ms ease, max-width 220ms ease, opacity 200ms ease, transform 220ms ease",
            pointerEvents: splitEnabled ? "auto" : "none",
          })}
        >
          <SplitGraphPanel />
        </Box>
      </Box>

      <Footer />
    </Box>
  );
};
