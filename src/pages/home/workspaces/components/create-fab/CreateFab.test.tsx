import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateFab, type CreateFabHandle } from "./CreateFab";

describe("CreateFab", () => {
  it("renders with default title tooltip", async () => {
    const handleClick = vi.fn();
    render(<CreateFab onClick={handleClick} />);
    const button = screen.getByRole("button");
    fireEvent.mouseOver(button);
    // Tooltip text appears on hover
    expect(await screen.findByText(/Create/i)).toBeInTheDocument();
  });

  it("supports imperative click via ref", () => {
    const handleClick = vi.fn();
    const ref = React.createRef<CreateFabHandle>();
    render(<CreateFab ref={ref} onClick={handleClick} title="Add item" />);
    // Imperative click should trigger the onClick handler
    ref.current?.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
