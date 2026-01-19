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
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

const vertex: Vertex = {
  id: "v-1",
  title: "Vertex One",
  asset_directory: "/tmp/assets/v-1",
  parent_id: null,
  workspace_id: workspace.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  items_behavior: { child_kind: "chapter", display: "grid" },
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
          hasItems={false}
          onSelectTab={vi.fn()}
          {...override}
        />
      </I18nextProvider>
    );

  it("renders fields with initial values", () => {
    renderTab();
    expect(screen.getByDisplayValue("Vertex One")).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t("propertiesTab.assetDirectoryLabel"))
    ).toBeInTheDocument();
  });

  it("updates title on blur when valid", async () => {
    renderTab();
    const input = screen.getByLabelText(/Title/i);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(mockUpdateVertex).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "Updated" } });
    fireEvent.blur(input);
    await waitFor(() => expect(mockUpdateVertex).toHaveBeenCalled());
  });

  it("allows selecting graph in items display", () => {
    renderTab();
    const select = screen.getByLabelText(/Items display/i);
    fireEvent.mouseDown(select);
    expect(screen.getByText(/Graph/i)).toBeInTheDocument();
  });

  it("adds tags from the properties tab", async () => {
    renderTab();
    const input = screen.getByLabelText(i18n.t("tagsTab.newTag"));
    fireEvent.change(input, { target: { value: "draft" } });
    fireEvent.click(screen.getByLabelText(i18n.t("tagsTab.add")));
    await waitFor(() =>
      expect(mockUpdateVertex).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ["draft"] })
      )
    );
  });

  it("removes tags from the properties tab", async () => {
    renderTab({ vertex: { ...vertex, tags: ["alpha"] } });
    fireEvent.click(screen.getByTestId("delete-tag-alpha"));
    await waitFor(() =>
      expect(mockUpdateVertex).toHaveBeenCalledWith(
        expect.objectContaining({ tags: [] })
      )
    );
  });
});
