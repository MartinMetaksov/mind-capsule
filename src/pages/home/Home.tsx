import { Box } from "@mui/material";
import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./header/Header";
import { Footer } from "./footer/Footer";

export const Home: React.FC = () => {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <Box component="main" sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
          <Outlet />
        </Box>
      </Box>

      <Footer />
    </Box>
  );
};
