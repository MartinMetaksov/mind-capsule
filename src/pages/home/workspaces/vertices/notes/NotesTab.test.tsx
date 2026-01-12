import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { NotesTab } from "./NotesTab";
import type { Vertex } from "@/core/vertex";
import { Reference } from "@/core/common/reference";

const mockUpdateReferences = vi.fn();

const vertex: Vertex = {
  id: "v-1",
  title: "Vertex One",
  workspace_id: "ws-1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  children_behavior: { child_kind: "item", display: "grid" },
};

describe("NotesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTab = (override?: Partial<React.ComponentProps<typeof NotesTab>>) =>
    render(
      <I18nextProvider i18n={i18n}>
        <NotesTab
          vertex={{ ...vertex, ...(override?.vertex ?? {}) }}
          references={[
            {
              type: "note",
              text: "First note",
              created_at: "2024-01-02T00:00:00.000Z",
            } as Reference,
          ]}
          onReferencesUpdated={mockUpdateReferences}
        />
      </I18nextProvider>
    );

  it("renders note preview by default", () => {
    renderTab();
    expect(screen.getByText(/First note/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Preview/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("creates a new revision", async () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Create new revision/i }));
    await waitFor(() => expect(mockUpdateReferences).toHaveBeenCalled());
  });

  it("switches to edit mode and auto-saves on blur", async () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Updated note" } });
    fireEvent.blur(textarea);
    await waitFor(() => expect(mockUpdateReferences).toHaveBeenCalled());
  });
});
