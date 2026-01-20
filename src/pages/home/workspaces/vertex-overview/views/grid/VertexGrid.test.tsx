import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VertexGrid, type VertexItem } from "./VertexGrid";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";

// Mock ResizeObserver for layout calculations
beforeAll(() => {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
    MockResizeObserver;
});

const workspace: Workspace = {
  id: "ws-1",
  name: "Workspace One",
  path: "/tmp/ws",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

const makeVertex = (id: string, title: string): Vertex => ({
  id,
  title,
  asset_directory: `/tmp/assets/${id}`,
  parent_id: null,
  workspace_id: workspace.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  items_behavior: { child_kind: "item", display: "grid" },
});

const items: VertexItem[] = [
  { vertex: makeVertex("v-1", "One"), workspace },
  { vertex: makeVertex("v-2", "Two"), workspace },
];

describe("VertexGrid", () => {
  it("renders vertex nodes", () => {
    render(
      <VertexGrid
        items={items}
        selectedVertexId={null}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("marks selected vertex and handles delete", () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(
      <VertexGrid
        items={items}
        selectedVertexId="v-2"
        onSelect={onSelect}
        onDeleteVertex={onDelete}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Two" }));
    expect(onSelect).toHaveBeenCalledWith("v-2");
    fireEvent.click(screen.getAllByRole("button", { name: /delete/i })[0]);
    expect(onDelete).toHaveBeenCalled();
  });
});
