import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders application", () => {
  render(<App />);
  expect(screen.getAllByText(/mind capsule/i).length).toBeGreaterThan(0);
});
