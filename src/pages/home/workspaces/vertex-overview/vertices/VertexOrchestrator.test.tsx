import * as React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { VertexOrchestrator } from "./VertexOrchestrator";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";

// Mock ResizeObserver for MUI Tabs
beforeAll(() => {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
    MockResizeObserver;
});

// Simplify heavy child components
vi.mock("../../components/BreadcrumbsTrail", () => ({
  BreadcrumbsTrail: () => <div>Breadcrumbs</div>,
}));
vi.mock("../../components/VerticalTabs", () => ({
  VerticalTabs: ({ items }: { items: { label: string }[] }) => (
    <div>{items.map((i) => i.label).join("|")}</div>
  ),
}));
vi.mock("../VertexOverviewTab", () => ({
  VertexOverviewTab: () => <div>VertexOverviewTab</div>,
}));
vi.mock("./properties/PropertiesTab", () => ({ PropertiesTab: () => <div>PropertiesTab</div> }));
vi.mock("./files/FilesTab", () => ({ FilesTab: () => <div>FilesTab</div> }));
vi.mock("./notes/NotesTab", () => ({ NotesTab: () => <div>NotesTab</div> }));
vi.mock("./images/ImagesTab", () => ({ ImagesTab: () => <div>ImagesTab</div> }));
vi.mock("./links/LinksTab", () => ({ LinksTab: () => <div>LinksTab</div> }));

const workspace: Workspace = {
  id: "ws-1",
  name: "Workspace One",
  path: "/tmp/ws",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

const baseVertex: Vertex = {
  id: "v-1",
  title: "Vertex One",
  asset_directory: "/tmp/assets/v-1",
  parent_id: null,
  workspace_id: workspace.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  items_behavior: { child_kind: "item", display: "grid" },
};

const renderOrchestrator = (vertex: Vertex) =>
  render(
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <VertexOrchestrator
          vertex={vertex}
          workspace={workspace}
          trail={[{ vertex, workspace }]}
          onJumpTo={vi.fn()}
          onBackToRoot={vi.fn()}
        />
      </BrowserRouter>
    </I18nextProvider>
  );

describe("VertexOrchestrator", () => {
  it("renders items tab by default for non-leaf vertices", () => {
    renderOrchestrator({ ...baseVertex, is_leaf: false, default_tab: "items" });
    expect(screen.getByText("VertexOverviewTab")).toBeInTheDocument();
  });

  it("omits items tab for leaf vertices and shows properties", () => {
    renderOrchestrator({ ...baseVertex, is_leaf: true, default_tab: "items" });
    expect(screen.queryByText("VertexOverviewTab")).not.toBeInTheDocument();
    expect(screen.getByText("PropertiesTab")).toBeInTheDocument();
  });
});
