import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { NotesTab } from "./NotesTab";
import type { Vertex } from "@/core/vertex";

const mockListNotes = vi.fn();
const mockCreateNote = vi.fn();
const mockUpdateNote = vi.fn();
const mockDeleteNote = vi.fn();

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    listNotes: mockListNotes,
    createNote: mockCreateNote,
    updateNote: mockUpdateNote,
    deleteNote: mockDeleteNote,
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
  tags: [],
  children_behavior: { child_kind: "item", display: "grid" },
};

describe("NotesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListNotes.mockResolvedValue([
      { name: "note-1.md", text: "First note" },
    ]);
    mockCreateNote.mockResolvedValue({ name: "note-2.md", text: "" });
    mockUpdateNote.mockResolvedValue({ name: "note-1.md", text: "Updated note" });
    mockDeleteNote.mockResolvedValue(undefined);
  });

  const renderTab = (override?: Partial<React.ComponentProps<typeof NotesTab>>) =>
    render(
      <I18nextProvider i18n={i18n}>
        <NotesTab
          vertex={{ ...vertex, ...(override?.vertex ?? {}) }}
        />
      </I18nextProvider>
    );

  it("renders note preview by default", async () => {
    renderTab();
    expect(await screen.findByText(/First note/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Preview/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("creates a new revision", async () => {
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: /Create new revision/i }));
    await waitFor(() => expect(mockCreateNote).toHaveBeenCalled());
  });

  it("switches to edit mode and auto-saves on blur", async () => {
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: /Edit/i }));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Updated note" } });
    fireEvent.blur(textarea);
    await waitFor(() =>
      expect(mockUpdateNote).toHaveBeenCalledWith(vertex, "note-1.md", "Updated note")
    );
  });
});
