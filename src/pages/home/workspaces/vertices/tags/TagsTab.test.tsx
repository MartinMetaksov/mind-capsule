import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TagsTab } from "./TagsTab";
import type { Vertex } from "@/core/vertex";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

const mockUpdateVertex = vi.fn();

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    updateVertex: mockUpdateVertex,
  }),
}));

const vertex: Vertex = {
  id: "v-1",
  title: "Vertex One",
  asset_directory: "/tmp/assets/v-1",
  parent_id: null,
  workspace_id: "ws-1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: ["existing"],
  items_behavior: { child_kind: "item", display: "grid" },
};

describe("TagsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTab = (props?: Partial<React.ComponentProps<typeof TagsTab>>) =>
    render(
      <I18nextProvider i18n={i18n}>
        <TagsTab vertex={vertex} {...props} />
      </I18nextProvider>
    );

  it("renders existing tags", () => {
    renderTab();
    expect(screen.getByText("existing")).toBeInTheDocument();
  });

  it("adds a new tag on button click", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText(/New tag/i), { target: { value: "newTag" } });
    fireEvent.click(screen.getByRole("button", { name: /Add tag/i }));
    await waitFor(() => expect(mockUpdateVertex).toHaveBeenCalled());
  });

  it("removes a tag on delete click", async () => {
    renderTab();
    const deleteButton = screen.getByTestId("delete-tag-existing");
    fireEvent.click(deleteButton);
    await waitFor(() => expect(mockUpdateVertex).toHaveBeenCalled());
  });
});
