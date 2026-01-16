import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { ProjectsTab } from "./ProjectsTab";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";
import { BrowserRouter } from "react-router-dom";

// jsdom lacks ResizeObserver; mock it for MUI components
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
  name: "Default Workspace",
  path: "/tmp/ws",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

const vertex: Vertex = {
  id: "v-1",
  title: "Project One",
  asset_directory: "/tmp/assets/v-1",
  parent_id: null,
  workspace_id: workspace.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  children_behavior: { child_kind: "item", display: "grid" },
};

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    createVertex: vi.fn(),
  }),
}));

const renderTab = (props?: Partial<React.ComponentProps<typeof ProjectsTab>>) =>
  render(
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <ProjectsTab
          items={[{ vertex, workspace }]}
          workspaces={[workspace]}
          onOpenVertex={vi.fn()}
          onDeleteProject={vi.fn()}
          onChanged={vi.fn()}
          {...props}
        />
      </BrowserRouter>
    </I18nextProvider>
  );

describe("ProjectsTab", () => {
  it("renders project cards", () => {
    renderTab();
    expect(screen.getByText("Project One")).toBeInTheDocument();
  });

  it("opens workspace picker popover when fab clicked", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Create project/i }));
    expect(screen.getByText(/Add project to workspace/i)).toBeInTheDocument();
  });
});
