import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/home/Home";
import { Box } from "@mui/material";
import { VertexOrchestrator } from "./pages/home/vertex-overview/VertexOrchestrator";
import { ThemeModeProvider } from "./utils/themes/ThemeModeProvider";

export default function App() {
  return (
    <Box>
      <Box>
        <ThemeModeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />}>
                <Route index element={<VertexOrchestrator />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ThemeModeProvider>
      </Box>
    </Box>
  );
}
