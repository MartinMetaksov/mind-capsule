import * as React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { BrowserRouter } from "react-router-dom";
import i18n from "@/i18n";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";
import {
  VertexOverviewTab,
  type VertexOverviewTabProps,
} from "./VertexOverviewTab";

const mockGetVertices = vi.fn();
const mockCreateVertex = vi.fn();
const mockRemoveVertex = vi.fn();
const mockGetAllVertices = vi.fn<() => Promise<Vertex[]>>();
const mockListNotes = vi.fn();
const mockListImages = vi.fn();
const mockListLinks = vi.fn();

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    getVertices: mockGetVertices,
    createVertex: mockCreateVertex,
    removeVertex: mockRemoveVertex,
    getAllVertices: mockGetAllVertices,
    listNotes: mockListNotes,
    listImages: mockListImages,
    listLinks: mockListLinks,
  }),
}));

const invokeMock = vi.fn();
const readDirMock = vi.fn();
const removeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: invokeMock,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onDragDropEvent: vi.fn(async () => () => {}),
  }),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: readDirMock,
  remove: removeMock,
  rename: vi.fn(),
  readFile: vi.fn(),
}));

// Mock ResizeObserver for components that use it
beforeAll(() => {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (
    globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }
  ).ResizeObserver = MockResizeObserver;
});

const workspace: Workspace = {
  id: "ws-1",
  name: "Workspace One",
  path: "/tmp/ws",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

const item: Vertex = {
  id: "item-1",
  title: "Item One",
  asset_directory: "/tmp/assets/item-1",
  parent_id: "parent",
  workspace_id: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  items_behavior: { child_kind: "item", display: "grid" },
};

const parent: Vertex = {
  id: "parent",
  title: "Parent",
  asset_directory: "/tmp/assets/parent",
  parent_id: null,
  workspace_id: workspace.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  items_behavior: { child_kind: "chapter", display: "grid" },
};

const project: Vertex = {
  id: "v-1",
  title: "Project One",
  asset_directory: "/tmp/assets/v-1",
  parent_id: null,
  workspace_id: workspace.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  items_behavior: { child_kind: "item", display: "grid" },
};

type ItemsOverviewProps = Extract<
  VertexOverviewTabProps,
  { variant: "items" }
>;
type ProjectsOverviewProps = Extract<
  VertexOverviewTabProps,
  { variant: "projects" }
>;
type DetachedOverviewProps = Extract<
  VertexOverviewTabProps,
  { variant: "detached" }
>;

const renderTab = (ui: React.ReactElement) =>
  render(
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>{ui}</BrowserRouter>
    </I18nextProvider>
  );

beforeEach(() => {
  mockListNotes.mockResolvedValue([]);
  mockListImages.mockResolvedValue([]);
  mockListLinks.mockResolvedValue([]);
});

describe("VertexOverviewTab (items)", () => {
  const renderItems = (override?: Partial<ItemsOverviewProps>) =>
    renderTab(
      <VertexOverviewTab
        variant="items"
        label="Chapters"
        vertex={parent}
        workspace={workspace}
        onOpenVertex={vi.fn()}
        {...override}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVertices.mockResolvedValue([]);
    mockCreateVertex.mockResolvedValue(undefined);
    mockRemoveVertex.mockResolvedValue(undefined);
  });

  it("shows empty state when no items", async () => {
    renderItems();
    await waitFor(() => expect(mockGetVertices).toHaveBeenCalled());
    expect(screen.getByText(/No chapter found/i)).toBeInTheDocument();
  });

  it("renders items when present", async () => {
    mockGetVertices.mockResolvedValue([item]);
    renderItems();
    expect(await screen.findByText("Item One")).toBeInTheDocument();
  });

  it("uses default list view when set on vertex", async () => {
    mockGetVertices.mockResolvedValue([item]);
    renderItems({
      vertex: {
        ...parent,
        items_behavior: { child_kind: "chapter", display: "list" },
      },
    });
    expect(await screen.findByTestId("vertex-overview-list")).toBeInTheDocument();
  });

  it("switches to list view", async () => {
    mockGetVertices.mockResolvedValue([item]);
    renderItems();
    const listButtons = screen.getAllByRole("button", { name: /List view/i });
    fireEvent.click(listButtons[0]);
    expect(await screen.findByTestId("vertex-overview-list")).toBeInTheDocument();
  });

  it("switches view mode via keyboard shortcuts", async () => {
    mockGetVertices.mockResolvedValue([item]);
    renderItems();

    fireEvent.keyDown(window, { key: "g", ctrlKey: true });
    expect(await screen.findByTestId("vertex-overview-graph")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "l", ctrlKey: true });
    expect(await screen.findByTestId("vertex-overview-list")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "r", ctrlKey: true });
    await waitFor(() => {
      expect(screen.queryByTestId("vertex-overview-list")).not.toBeInTheDocument();
      expect(screen.queryByTestId("vertex-overview-graph")).not.toBeInTheDocument();
    });
  });

  it("sorts items alphabetically by default", async () => {
    mockGetVertices.mockResolvedValue([
      { ...item, id: "item-b", title: "Bravo" },
      { ...item, id: "item-a", title: "Alpha" },
    ]);
    renderItems({
      vertex: {
        ...parent,
        items_behavior: { child_kind: "chapter", display: "list" },
      },
    });
    const list = await screen.findByTestId("vertex-overview-list");
    const alpha = within(list).getByText("Alpha");
    const bravo = within(list).getByText("Bravo");
    expect(
      alpha.compareDocumentPosition(bravo) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("respects manual order when provided", async () => {
    mockGetVertices.mockResolvedValue([
      { ...item, id: "item-b", title: "Bravo" },
      { ...item, id: "item-a", title: "Alpha" },
    ]);
    renderItems({
      vertex: {
        ...parent,
        items_behavior: { child_kind: "chapter", display: "list" },
        items_layout: {
          mode: "linear",
          order: { "item-b": 0, "item-a": 1 },
        },
      },
    });
    const list = await screen.findByTestId("vertex-overview-list");
    const alpha = within(list).getByText("Alpha");
    const bravo = within(list).getByText("Bravo");
    expect(
      bravo.compareDocumentPosition(alpha) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("opens create dialog via fab", () => {
    renderItems();
    const fab = screen.getByRole("button", { name: /Create item/i });
    fireEvent.click(fab);
    expect(screen.getAllByText(/Create item/i).length).toBeGreaterThan(1);
  });
});

describe("VertexOverviewTab (projects)", () => {
  const renderProjects = (override?: Partial<ProjectsOverviewProps>) =>
    renderTab(
      <VertexOverviewTab
        variant="projects"
        items={[{ vertex: project, workspace }]}
        workspaces={[workspace]}
        onOpenVertex={vi.fn()}
        onDeleteProject={vi.fn()}
        onChanged={vi.fn()}
        {...override}
      />
    );

  it("renders project cards", () => {
    renderProjects();
    expect(screen.getByText("Project One")).toBeInTheDocument();
  });

  it("opens workspace picker popover when fab clicked", () => {
    renderProjects();
    fireEvent.click(screen.getByRole("button", { name: /Create project/i }));
    expect(screen.getByText(/Add project to workspace/i)).toBeInTheDocument();
  });
});

describe("VertexOverviewTab (detached)", () => {
  const workspaces: Workspace[] = [workspace];

  const renderDetached = (override?: Partial<DetachedOverviewProps>) =>
    renderTab(
      <VertexOverviewTab
        variant="detached"
        workspaces={workspaces}
        onChanged={vi.fn()}
        {...override}
      />
    );

  beforeEach(() => {
    invokeMock.mockReset();
    readDirMock.mockReset();
    removeMock.mockReset();
    mockGetAllVertices.mockReset();
    mockCreateVertex.mockReset();
  });

  it("filters hidden and known directories", async () => {
    mockGetAllVertices.mockImplementation(async () => [
      {
        id: "known",
        title: "Known",
        asset_directory: "",
        parent_id: null,
        workspace_id: "ws-1",
        created_at: "",
        updated_at: "",
        tags: [],
      },
    ]);
    readDirMock.mockResolvedValue([
      { name: ".cache", isDirectory: true, isFile: false, isSymlink: false },
      { name: "known", isDirectory: true, isFile: false, isSymlink: false },
      {
        name: "detached-1",
        isDirectory: true,
        isFile: false,
        isSymlink: false,
      },
    ]);

    renderDetached();

    expect(await screen.findByText(/Detached projects/i)).toBeInTheDocument();
    expect(screen.queryByText(".cache")).not.toBeInTheDocument();
    expect(screen.queryByText("known")).not.toBeInTheDocument();
    expect(screen.getByText("detached-1")).toBeInTheDocument();
  });

  it("opens folder and deletes detached directories", async () => {
    mockGetAllVertices.mockImplementation(async () => []);
    readDirMock.mockResolvedValue([
      {
        name: "detached-2",
        isDirectory: true,
        isFile: false,
        isSymlink: false,
      },
    ]);

    renderDetached();

    await screen.findByText("detached-2");

    fireEvent.click(screen.getByLabelText(/Open folder/i));
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("fs_open_path", {
        path: "/tmp/ws/detached-2",
      });
    });

    fireEvent.click(screen.getByLabelText(/Delete/i));
    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

    await waitFor(() => {
      expect(removeMock).toHaveBeenCalledWith("/tmp/ws/detached-2", {
        recursive: true,
      });
    });
  });
});
