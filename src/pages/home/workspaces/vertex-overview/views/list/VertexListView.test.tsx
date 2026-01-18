import * as React from "react";
import { render, screen } from "@testing-library/react";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";
import { VertexListView } from "./VertexListView";

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
  title: "List Item",
  asset_directory: "",
  parent_id: null,
  workspace_id: workspace.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  thumbnail_path: "/tmp/thumb.png",
};

describe("VertexListView", () => {
  it("renders thumbnail and title", () => {
    render(
      <VertexListView
        items={[{ vertex, workspace }]}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("List Item")).toBeInTheDocument();
    const img = screen.getByRole("img", { name: /List Item/i });
    expect(img).toHaveAttribute("src", "/tmp/thumb.png");
  });
});
