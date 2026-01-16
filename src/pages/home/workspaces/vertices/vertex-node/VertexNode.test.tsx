import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VertexNode } from "./VertexNode";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";

// Mock ResizeObserver for MUI transitions/layout
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

const vertex: Vertex = {
  id: "v-1",
  title: "Vertex Title",
  asset_directory: "/tmp/assets/v-1",
  parent_id: null,
  workspace_id: workspace.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  children_behavior: { child_kind: "item", display: "grid" },
};

describe("VertexNode", () => {
  it("renders title and workspace label", () => {
    render(
      <VertexNode
        vertex={vertex}
        workspace={workspace}
        selected={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Vertex Title")).toBeInTheDocument();
    expect(screen.getByText("Workspace One")).toBeInTheDocument();
  });

  it("triggers select and delete handlers", () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(
      <VertexNode
        vertex={vertex}
        workspace={workspace}
        selected={false}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Vertex Title" }));
    expect(onSelect).toHaveBeenCalledWith(vertex.id);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(vertex);
  });
});
