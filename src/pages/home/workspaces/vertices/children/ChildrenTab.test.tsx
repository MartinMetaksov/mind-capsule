import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChildrenTab } from "./ChildrenTab";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

const mockGetVertices = vi.fn();
const mockCreateVertex = vi.fn();
const mockRemoveVertex = vi.fn();

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    getVertices: mockGetVertices,
    createVertex: mockCreateVertex,
    removeVertex: mockRemoveVertex,
  }),
}));

// Mock ResizeObserver for components that use it
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
  purpose: "Test",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

const child: Vertex = {
  id: "child-1",
  title: "Child One",
  asset_directory: "/tmp/assets/child-1",
  parent_id: "parent",
  workspace_id: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  children_behavior: { child_kind: "item", display: "grid" },
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
  children_behavior: { child_kind: "chapter", display: "grid" },
};

const renderTab = (override?: Partial<React.ComponentProps<typeof ChildrenTab>>) =>
  render(
    <I18nextProvider i18n={i18n}>
      <ChildrenTab
        label="Chapters"
        vertex={parent}
        workspace={workspace}
        onOpenVertex={vi.fn()}
        {...override}
      />
    </I18nextProvider>
  );

describe("ChildrenTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVertices.mockResolvedValue([]);
    mockCreateVertex.mockResolvedValue(undefined);
    mockRemoveVertex.mockResolvedValue(undefined);
  });

  it("shows empty state when no children", async () => {
    renderTab();
    await waitFor(() => expect(mockGetVertices).toHaveBeenCalled());
    expect(screen.getByText(/No chapter found/i)).toBeInTheDocument();
  });

  it("renders children when present", async () => {
    mockGetVertices.mockResolvedValue([child]);
    renderTab();
    expect(await screen.findByText("Child One")).toBeInTheDocument();
  });

  it("opens create dialog via fab", () => {
    renderTab();
    const fab = screen.getByRole("button", { name: /Create item/i });
    fireEvent.click(fab);
    expect(screen.getAllByText(/Create item/i).length).toBeGreaterThan(1);
  });
});
