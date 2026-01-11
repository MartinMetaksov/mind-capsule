import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App routing and layout", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  test("renders application shell", () => {
    render(<App />);
    expect(screen.getAllByText(/mind capsule/i).length).toBeGreaterThan(0);
  });

  test("shows vertex not found page for unknown vertex path", async () => {
    window.history.pushState({}, "", "/v-nonexistent");
    render(<App />);
    expect(
      await screen.findByText(/vertex not found/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();
  });
});
