import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { PropertiesTab } from "./PropertiesTab";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";

const mockUpdateVertex = vi.fn();

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    updateVertex: mockUpdateVertex,
  }),
}));

const workspace: Workspace = {
  id: "ws-1",
  name: "WS One",
  path: "/tmp/ws",
  purpose: "Test",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

const vertex: Vertex = {
  id: "v-1",
  title: "Vertex One",
  workspace_id: workspace.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  children_behavior: { child_kind: "chapter", display: "grid" },
};

describe("PropertiesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTab = (override?: Partial<React.ComponentProps<typeof PropertiesTab>>) =>
    render(
      <I18nextProvider i18n={i18n}>
        <PropertiesTab
          vertex={vertex}
          workspace={workspace}
          hasChildren={false}
          onSelectTab={vi.fn()}
          {...override}
        />
      </I18nextProvider>
    );

  it("renders fields with initial values", () => {
    renderTab();
    expect(screen.getByDisplayValue("Vertex One")).toBeInTheDocument();
    expect(screen.getByDisplayValue("chapter")).toBeInTheDocument();
  });

  it("requires title before saving and then calls update", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    expect(mockUpdateVertex).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    await waitFor(() => expect(mockUpdateVertex).toHaveBeenCalled());
  });
});
