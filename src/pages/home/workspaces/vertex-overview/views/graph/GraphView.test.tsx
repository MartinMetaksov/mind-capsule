import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";
import type { VertexItem } from "../../../vertices/vertex-grid/VertexGrid";
import { GraphView } from "./GraphView";

const mockGetWorkspaces = vi.fn();
const mockGetAllVertices = vi.fn();
const mockRemoveVertex = vi.fn();
const mockUpdateVertex = vi.fn();

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    getWorkspaces: mockGetWorkspaces,
    getAllVertices: mockGetAllVertices,
    removeVertex: mockRemoveVertex,
    updateVertex: mockUpdateVertex,
  }),
}));

const workspace: Workspace = {
  id: "ws-1",
  name: "Workspace One",
  path: "/tmp/ws",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

const vertexOne: Vertex = {
  id: "v-1",
  title: "Vertex One",
  asset_directory: "/tmp/ws/v-1",
  parent_id: null,
  workspace_id: workspace.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

const vertexTwo: Vertex = {
  id: "v-2",
  title: "Vertex Two",
  asset_directory: "/tmp/ws/v-2",
  parent_id: vertexOne.id,
  workspace_id: workspace.id,
  created_at: "2024-01-03T00:00:00.000Z",
  updated_at: "2024-01-04T00:00:00.000Z",
  tags: [],
};

const items: VertexItem[] = [
  { vertex: vertexOne, workspace },
  { vertex: vertexTwo, workspace },
];

describe("GraphView", () => {
  beforeEach(() => {
    mockGetWorkspaces.mockResolvedValue([workspace]);
    mockGetAllVertices.mockResolvedValue([vertexOne, vertexTwo]);
  });

  it("renders workspace and vertex labels", async () => {
    render(
      <GraphView
        items={items}
        currentVertex={vertexOne}
        onOpenVertex={vi.fn()}
      />
    );

    expect(await screen.findByText("Workspace One")).toBeInTheDocument();
    expect(screen.getByText("Vertex One")).toBeInTheDocument();
    expect(screen.getByText("Vertex Two")).toBeInTheDocument();
  });

  it("highlights the current vertex with a pulse class", async () => {
    const { container } = render(
      <GraphView items={items} currentVertex={vertexOne} />
    );

    await screen.findByText("Vertex One");
    await waitFor(() => {
      const selected = container.querySelectorAll(
        "circle.graph-node-selected"
      );
      expect(selected.length).toBe(1);
    });
  });

  it("allows opening a non-current vertex", async () => {
    const onOpenVertex = vi.fn();
    const { container } = render(
      <GraphView
        items={items}
        currentVertex={vertexOne}
        onOpenVertex={onOpenVertex}
      />
    );

    await screen.findByText("Vertex Two");
    const circleForVertexTwo = await waitFor(() => {
      const match = container.querySelector(
        'circle.graph-node[data-node-id="v-2"]'
      );
      if (!match) {
        throw new Error("Vertex Two circle not found yet.");
      }
      return match as SVGCircleElement;
    });
    fireEvent.click(circleForVertexTwo);

    const openButton = await waitFor(() => {
      const openButtons = screen.getAllByRole("button", {
        name: /Open vertex/i,
      });
      const enabled = openButtons.find(
        (button) => !(button as HTMLButtonElement).disabled
      );
      if (!enabled) {
        throw new Error("Open vertex button not enabled yet.");
      }
      return enabled as HTMLButtonElement;
    });
    fireEvent.click(openButton);

    await waitFor(() =>
      expect(onOpenVertex).toHaveBeenCalledWith(vertexTwo.id)
    );
  });
});
