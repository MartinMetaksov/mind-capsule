import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/home/Home";
import { Box } from "@mui/material";
import { ThemeModeProvider } from "./utils/ThemeModeContext";
import { ProjectOverview } from "./pages/home/project-overview/ProjectOverview";

export default function App() {
  return (
    <Box>
      <Box>
        <ThemeModeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />}>
                <Route index element={<ProjectOverview />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ThemeModeProvider>
      </Box>
    </Box>
  );
}
