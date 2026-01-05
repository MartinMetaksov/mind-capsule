import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/home/Home";
import { Box } from "@mui/material";
import { WorkspaceOrchestrator } from "./pages/home/workspaces/WorkspaceOrchestrator";
import { ThemeModeProvider } from "./utils/themes/ThemeModeProvider";

export default function App() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <ThemeModeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />}>
              <Route index element={<WorkspaceOrchestrator />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeModeProvider>
    </Box>
  );
}
