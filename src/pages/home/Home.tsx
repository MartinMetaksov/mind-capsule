import { Box } from "@mui/material";
import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./header/Header";

export const Home: React.FC = () => {
  return (
    <>
      <Header />
      <Box sx={{ margin: "30px 70px" }}>
        <Outlet />
      </Box>
    </>
  );
};
