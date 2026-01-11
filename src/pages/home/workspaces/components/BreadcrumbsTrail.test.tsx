import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BreadcrumbsTrail } from "./BreadcrumbsTrail";

describe("BreadcrumbsTrail", () => {
  it("renders root label", () => {
    render(<BreadcrumbsTrail rootLabel="Workspaces" />);
    expect(screen.getByText("Workspaces")).toBeInTheDocument();
  });

  it("renders items and handles clicks", () => {
    const onRootClick = vi.fn();
    const onChildClick = vi.fn();
    render(
      <BreadcrumbsTrail
        rootLabel="Root"
        onRootClick={onRootClick}
        items={[
          { id: "1", label: "First", onClick: onChildClick },
          { id: "2", label: "Second" },
        ]}
      />
    );

    fireEvent.click(screen.getByText("Root"));
    fireEvent.click(screen.getByText("First"));

    expect(onRootClick).toHaveBeenCalledTimes(1);
    expect(onChildClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});
