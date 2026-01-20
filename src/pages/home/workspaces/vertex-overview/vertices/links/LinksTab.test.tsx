import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LinksTab } from "./LinksTab";
import type { Vertex } from "@/core/vertex";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

const mockListLinks = vi.fn();
const mockCreateLink = vi.fn();
const mockDeleteLink = vi.fn();

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    listLinks: mockListLinks,
    createLink: mockCreateLink,
    deleteLink: mockDeleteLink,
  }),
}));

const vertex: Vertex = {
  id: "v-1",
  title: "Vertex",
  asset_directory: "/tmp/assets/v-1",
  parent_id: null,
  workspace_id: "ws-1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  items_behavior: { child_kind: "item", display: "grid" },
};

describe("LinksTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListLinks.mockResolvedValue([
      { id: "link-1", url: "https://example.com", title: "Example" },
    ]);
    mockCreateLink.mockResolvedValue({
      id: "link-2",
      url: "https://test.com",
      title: undefined,
    });
    mockDeleteLink.mockResolvedValue(undefined);
  });

  const renderTab = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <LinksTab
          vertex={vertex}
        />
      </I18nextProvider>
    );

  it("renders existing links", async () => {
    renderTab();
    expect(await screen.findByText("Example")).toBeInTheDocument();
    expect(await screen.findByText("https://example.com")).toBeInTheDocument();
  });

  it("adds a link on submit", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText(/URL/i), { target: { value: "https://test.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Add link/i }));
    await waitFor(() =>
      expect(mockCreateLink).toHaveBeenCalledWith(vertex, {
        url: "https://test.com",
        title: undefined,
      })
    );
  });

  it("deletes a link", async () => {
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: /Delete/i }));
    await waitFor(() => expect(mockDeleteLink).toHaveBeenCalledWith(vertex, "link-1"));
  });
});
