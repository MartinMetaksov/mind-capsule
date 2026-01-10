import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/home/Home";
import { Box } from "@mui/material";
import { WorkspaceOrchestrator } from "./pages/home/workspaces/WorkspaceOrchestrator";
import { ThemeModeProvider } from "./utils/themes/ThemeModeProvider";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";

export default function App() {
  return (
    <Box
      sx={{
        height: "100vh",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <I18nextProvider i18n={i18n}>
        <ThemeModeProvider>
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <Routes>
              <Route path="/" element={<Home />}>
                <Route index element={<WorkspaceOrchestrator />} />
                <Route path="*" element={<WorkspaceOrchestrator />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ThemeModeProvider>
      </I18nextProvider>
    </Box>
  );
}
