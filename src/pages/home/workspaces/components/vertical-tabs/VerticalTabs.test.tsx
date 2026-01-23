import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VerticalTabs } from "./VerticalTabs";
import HomeIcon from "@mui/icons-material/Home";

describe("VerticalTabs", () => {
  const items = [
  { value: "one", label: "One", icon: <HomeIcon data-testid="icon-one" /> },
  { value: "two", label: "Two", icon: <HomeIcon data-testid="icon-two" /> },
  ] as Array<{ value: "one" | "two"; label: string; icon: JSX.Element }>;

  beforeAll(() => {
    class ResizeObserverMock {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    global.ResizeObserver = ResizeObserverMock;
  });

  it("renders tabs and highlights selected", () => {
    render(<VerticalTabs value="one" onChange={() => {}} items={items} />);
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange when a tab is clicked", () => {
    const handleChange = vi.fn();
    render(<VerticalTabs value="one" onChange={handleChange} items={items} />);
    fireEvent.click(screen.getByRole("tab", { name: "Two" }));
    expect(handleChange).toHaveBeenCalledWith("two");
  });
});
