import { Box } from "@mui/material";
import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./header/Header";
import { Footer } from "./footer/Footer";
import { SplitGraphPanel } from "./SplitGraphPanel";
import { useWorkspaces } from "./workspaces/hooks/use-workspaces/useWorkspaces";
import { SplitScreenProvider } from "./SplitScreenProvider";

export const Home: React.FC = () => {
  const [splitEnabled, setSplitEnabled] = React.useState(false);
  const { workspaces, loading: workspacesLoading } = useWorkspaces();
  const hasWorkspaces = workspaces && workspaces.length > 0;
  const disableActions = !workspacesLoading && !hasWorkspaces;

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
        disableCompare={disableActions}
        disableSearch={disableActions}
      />

      <Box
        component="main"
        sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}
      >
        <SplitScreenProvider splitEnabled={splitEnabled}>
          <Box
            sx={{
              flex: splitEnabled ? "0 0 50%" : "1 1 100%",
              maxWidth: splitEnabled ? "50%" : "100%",
              minHeight: 0,
              display: "flex",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            <Outlet />
          </Box>
        </SplitScreenProvider>
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
            transition: "opacity 200ms ease, transform 220ms ease",
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
