import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LinksTab } from "./LinksTab";
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
  title: "Vertex",
  workspace_id: "ws-1",
  kind: "project",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  references: [
    { type: "url", url: "https://example.com", title: "Example" },
  ],
  children_behavior: { child_kind: "item", display: "grid" },
};

describe("LinksTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTab = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <LinksTab vertex={vertex} />
      </I18nextProvider>
    );

  it("renders existing links", () => {
    renderTab();
    expect(screen.getByText("Example")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
  });

  it("adds a link on submit", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText(/URL/i), { target: { value: "https://test.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Add link/i }));
    await waitFor(() => expect(mockUpdateVertex).toHaveBeenCalled());
  });

  it("deletes a link", async () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));
    await waitFor(() => expect(mockUpdateVertex).toHaveBeenCalled());
  });
});
