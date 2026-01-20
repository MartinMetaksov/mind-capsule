import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VertexListView } from "./VertexListView";
import type { VertexItem } from "../grid/VertexGrid";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";

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
  { vertex: makeVertex("v-1", "Alpha"), workspace },
  { vertex: makeVertex("v-2", "Bravo"), workspace },
  { vertex: makeVertex("v-3", "Charlie"), workspace },
];

const setRowLayout = (row: HTMLElement, top: number) => {
  Object.defineProperty(row, "offsetHeight", { value: 64 });
  row.getBoundingClientRect = () =>
    ({
      top,
      bottom: top + 64,
      left: 0,
      right: 600,
      width: 600,
      height: 64,
      x: 0,
      y: top,
      toJSON: () => {},
    }) as DOMRect;
};

describe("VertexListView", () => {
  it("calls onReorder when dragging between rows", async () => {
    const onReorder = vi.fn();
    render(
      <VertexListView
        items={items}
        onSelect={vi.fn()}
        onReorder={onReorder}
        dragLabel="Reorder"
      />
    );

    const rows = await screen.findAllByText(/Alpha|Bravo|Charlie/);
    const rowEls = rows.map((row) => row.closest("[data-vertex-id]") as HTMLElement);
    rowEls.forEach((rowEl, idx) => setRowLayout(rowEl, idx * 80));

    const dragButtons = screen.getAllByRole("button", { name: "Reorder" });
    fireEvent.pointerDown(dragButtons[0], { clientX: 10, clientY: 10, button: 0 });
    fireEvent.pointerMove(window, { clientX: 10, clientY: 130 });
    fireEvent.pointerUp(window);

    await waitFor(() => {
      expect(onReorder).toHaveBeenCalledWith("v-1", "v-2");
    });
  });
});
