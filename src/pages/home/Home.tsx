import { Box } from "@mui/material";
import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./header/Header";
import { Footer } from "./footer/Footer";

export const Home: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Header />

      <Box
        component="main"
        sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}
      >
        <Box
          sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}
        >
          <Outlet />
        </Box>
      </Box>

      <Footer />
    </Box>
  );
};
