import { Box } from "@mui/material";
import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./header/Header";
import { Footer } from "./footer/Footer";

export const Home: React.FC = () => {
  const sharedStyling = { px: { xs: 2, sm: 4, md: 6 } };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header sharedStyling={sharedStyling} />
      <Box component="main" sx={{ ...sharedStyling, flex: 1 }}>
        <Outlet />
      </Box>
      <Footer />
    </Box>
  );
};
