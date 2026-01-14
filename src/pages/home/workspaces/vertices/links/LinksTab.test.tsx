import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LinksTab } from "./LinksTab";
import type { Vertex } from "@/core/vertex";
import type { Reference } from "@/core/common/reference";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

const mockUpdateReferences = vi.fn();

const vertex: Vertex = {
  id: "v-1",
  title: "Vertex",
  asset_directory: "/tmp/assets/v-1",
  parent_id: null,
  workspace_id: "ws-1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  children_behavior: { child_kind: "item", display: "grid" },
};

describe("LinksTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTab = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <LinksTab
          vertex={vertex}
          references={
            [{ type: "url", url: "https://example.com", title: "Example" }] as Reference[]
          }
          onReferencesUpdated={mockUpdateReferences}
        />
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
    await waitFor(() => expect(mockUpdateReferences).toHaveBeenCalled());
  });

  it("deletes a link", async () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));
    await waitFor(() => expect(mockUpdateReferences).toHaveBeenCalled());
  });
});
