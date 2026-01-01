import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/home/Home";
import { Box } from "@mui/material";
import { VertexOverview } from "./pages/home/vertex-overview/VertexOverview";
import { ThemeModeProvider } from "./utils/themes/ThemeModeProvider";

export default function App() {
  return (
    <Box>
      <Box>
        <ThemeModeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />}>
                <Route index element={<VertexOverview />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ThemeModeProvider>
      </Box>
    </Box>
  );
}
