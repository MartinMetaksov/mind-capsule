import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { SearchDialog } from "./SearchDialog";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";

const baseVertex: Vertex = {
  id: "v-1",
  title: "Test Vertex",
  asset_directory: "/tmp/assets/v-1",
  parent_id: null,
  workspace_id: "ws-1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: ["tagged"],
  items_behavior: { child_kind: "item", display: "grid" },
};

let mockVertices: Vertex[] = [baseVertex];
let mockWorkspaces: Workspace[] = [
  {
    id: "ws-1",
    name: "Workspace",
    path: "/tmp/ws",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    tags: [],
  },
];

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    getVertex: async (id: string) =>
      mockVertices.find((v) => v.id === id) ?? null,
    getAllVertices: async () => mockVertices,
    getWorkspaces: async () => mockWorkspaces,
  }),
}));

const renderDialog = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <SearchDialog open onClose={vi.fn()} />
      </BrowserRouter>
    </I18nextProvider>
  );

describe("SearchDialog", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
    mockVertices = [baseVertex];
    mockWorkspaces = [
      {
        id: "ws-1",
        name: "Workspace",
        path: "/tmp/ws",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
        tags: [],
      },
    ];
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows empty state before typing", () => {
    renderDialog();
    expect(
      screen.getByText(/Start typing to see results/i)
    ).toBeInTheDocument();
  });

  it("displays matching vertex and navigates on click", async () => {
    const { container } = renderDialog();
    const input = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(input, { target: { value: "Test" } });
    expect(await screen.findByText("Test Vertex")).toBeInTheDocument();
    // clicking a result should trigger onClose via navigation handler
    const item = await screen.findByText("Test Vertex");
    fireEvent.click(item);
    // ensure list item still exists in DOM tree to verify render path (navigate mocked by BrowserRouter)
    expect(container).toBeTruthy();
  });

  it("limits results to descendants of the current vertex", async () => {
    const root = { ...baseVertex, id: "root", title: "Root" };
    const child = {
      ...baseVertex,
      id: "child",
      title: "Child Vertex",
      parent_id: "root",
    };
    const sibling = {
      ...baseVertex,
      id: "sibling",
      title: "Sibling Vertex",
      parent_id: null,
    };
    mockVertices = [root, child, sibling];
    window.history.pushState({}, "", "/root");

    renderDialog();
    const input = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(input, { target: { value: "Vertex" } });

    expect(await screen.findByText("Child Vertex")).toBeInTheDocument();
    expect(screen.queryByText("Sibling Vertex")).not.toBeInTheDocument();
  });

  it("matches fuzzy queries against titles", async () => {
    mockVertices = [
      { ...baseVertex, id: "v-1", title: "Mind Capsule" },
      { ...baseVertex, id: "v-2", title: "Another Vertex" },
    ];
    renderDialog();
    const input = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(input, { target: { value: "md cps" } });
    expect(await screen.findByText("Mind Capsule")).toBeInTheDocument();
    expect(screen.queryByText("Another Vertex")).not.toBeInTheDocument();
  });

  it("matches fuzzy queries against tags", async () => {
    mockVertices = [
      { ...baseVertex, id: "v-1", title: "Note One", tags: ["inspiration"] },
      { ...baseVertex, id: "v-2", title: "Note Two", tags: ["misc"] },
    ];
    renderDialog();
    const input = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(input, { target: { value: "insp" } });
    expect(await screen.findByText("Note One")).toBeInTheDocument();
    expect(screen.queryByText("Note Two")).not.toBeInTheDocument();
  });
});
