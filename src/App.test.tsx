import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders Story Master", () => {
  render(<App />);
  expect(screen.getAllByText(/story master/i).length).toBeGreaterThan(0);
});
