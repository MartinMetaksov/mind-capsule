import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders Story Master", () => {
  render(<App />);
  expect(screen.getByText(/story master/i)).toBeInTheDocument();
});
