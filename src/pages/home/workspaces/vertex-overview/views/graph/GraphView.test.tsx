import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";
import type { VertexItem } from "../grid/VertexGrid";
import { GraphView } from "./GraphView";

const mockGetWorkspaces = vi.fn();
const mockGetAllVertices = vi.fn();
const mockRemoveVertex = vi.fn();
const mockUpdateVertex = vi.fn();
const mockListNotes = vi.fn();
const mockListImages = vi.fn();
const mockListLinks = vi.fn();
const mockReadDir = vi.fn();
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockRemove = vi.fn();
const mockMkdir = vi.fn();
const mockIsTauri = vi.fn();

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    getWorkspaces: mockGetWorkspaces,
    getAllVertices: mockGetAllVertices,
    removeVertex: mockRemoveVertex,
    updateVertex: mockUpdateVertex,
    listNotes: mockListNotes,
    listImages: mockListImages,
    listLinks: mockListLinks,
  }),
}));

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => mockIsTauri(),
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: async (...parts: string[]) => parts.join("/"),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: (...args: unknown[]) => mockReadDir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  remove: (...args: unknown[]) => mockRemove(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
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

const workspaceTwo: Workspace = {
  id: "ws-2",
  name: "Workspace Two",
  path: "/tmp/ws-two",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

describe("GraphView", () => {
  const renderWithI18n = (ui: React.ReactElement) =>
    render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

  beforeEach(() => {
    mockGetWorkspaces.mockResolvedValue([workspace, workspaceTwo]);
    mockGetAllVertices.mockResolvedValue([vertexOne, vertexTwo]);
    mockReadDir.mockResolvedValue([]);
    mockReadFile.mockResolvedValue(new Uint8Array());
    mockWriteFile.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockIsTauri.mockReturnValue(false);
    mockUpdateVertex.mockResolvedValue(undefined);
    mockListNotes.mockResolvedValue([]);
    mockListImages.mockResolvedValue([]);
    mockListLinks.mockResolvedValue([]);
  });

  it("renders workspace and vertex labels", async () => {
    renderWithI18n(
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
    const { container } = renderWithI18n(
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
    const { container } = renderWithI18n(
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

  it("moves the asset directory when relocating to another workspace", async () => {
    mockIsTauri.mockReturnValue(true);
    const currentVertex = { ...vertexOne, asset_directory: "" };
    const { container } = renderWithI18n(
      <GraphView
        items={items}
        currentVertex={currentVertex}
        currentWorkspace={workspace}
      />
    );

    await screen.findByText("Workspace Two");
    const workspaceCircle = await waitFor(() => {
      const match = container.querySelector(
        'circle.graph-node[data-node-id="ws:ws-2"]'
      );
      if (!match) {
        throw new Error("Workspace Two circle not found yet.");
      }
      return match as SVGCircleElement;
    });
    fireEvent.click(workspaceCircle);

    const relocateButton = await waitFor(() => {
      const buttons = screen.getAllByRole("button", { name: /Relocate here/i });
      const enabled = buttons.find(
        (button) => !(button as HTMLButtonElement).disabled
      );
      if (!enabled) {
        throw new Error("Relocate button not enabled yet.");
      }
      return enabled as HTMLButtonElement;
    });
    fireEvent.click(relocateButton);

    const confirm = await screen.findByRole("button", { name: /Relocate/i });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(mockMkdir).toHaveBeenCalledWith("/tmp/ws-two/v-1", {
        recursive: true,
      });
      expect(mockRemove).toHaveBeenCalledWith("/tmp/ws/v-1", {
        recursive: true,
      });
      expect(mockUpdateVertex).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "v-1",
          workspace_id: "ws-2",
          parent_id: null,
          asset_directory: "/tmp/ws-two/v-1",
        })
      );
    });
  });
});
