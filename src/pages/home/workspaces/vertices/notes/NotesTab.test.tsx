import * as React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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
  items_behavior: { child_kind: "item", display: "grid" },
};

describe("NotesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
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

  it("renders note cards and opens a note", async () => {
    renderTab();
    expect(await screen.findByText(/First note/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/First note/i));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Preview/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("creates a new note", async () => {
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: /New note/i }));
    await waitFor(() => expect(mockCreateNote).toHaveBeenCalled());
  });

  it("switches to edit mode and auto-saves on blur", async () => {
    renderTab();
    fireEvent.click(await screen.findByText(/First note/i));
    fireEvent.click(await screen.findByRole("button", { name: /Edit/i }));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Updated note" } });
    fireEvent.blur(textarea);
    await waitFor(() =>
      expect(mockUpdateNote).toHaveBeenCalledWith(vertex, "note-1.md", "Updated note")
    );
  });

  it("deletes a note", async () => {
    renderTab();
    const deleteButton = await screen.findByRole("button", { name: /Delete note/i });
    fireEvent.click(deleteButton);
    const confirmButton = await screen.findByRole("button", { name: /Delete/i });
    fireEvent.click(confirmButton);
    await waitFor(() => expect(mockDeleteNote).toHaveBeenCalledWith(vertex, "note-1.md"));
  });

  it("removes a single history entry", async () => {
    window.localStorage.setItem(
      "notesHistory:v-1:note-1.md",
      JSON.stringify([
        { text: "Old note 1", at: "2024-01-01T10:00:00.000Z" },
        { text: "Old note 2", at: "2024-01-02T10:00:00.000Z" },
      ])
    );
    renderTab();
    fireEvent.click(await screen.findByText(/First note/i));
    fireEvent.click(await screen.findByRole("button", { name: /History/i }));
    expect(await screen.findByText(/Old note 1/i)).toBeInTheDocument();
    const historyRow = await screen.findByText(/Old note 1/i);
    const historyCard = historyRow.closest("div");
    if (!historyCard) throw new Error("History card not found");
    const removeButton = within(historyCard).getByRole("button", {
      name: /Remove version/i,
    });
    fireEvent.click(removeButton);
    await waitFor(() => {
      expect(screen.queryByText(/Old note 1/i)).not.toBeInTheDocument();
    });
    const stored = JSON.parse(
      window.localStorage.getItem("notesHistory:v-1:note-1.md") ?? "[]"
    ) as Array<{ text: string }>;
    expect(stored).toHaveLength(1);
  });

  it("clears the history list", async () => {
    window.localStorage.setItem(
      "notesHistory:v-1:note-1.md",
      JSON.stringify([
        { text: "Old note 1", at: "2024-01-01T10:00:00.000Z" },
      ])
    );
    renderTab();
    fireEvent.click(await screen.findByText(/First note/i));
    fireEvent.click(await screen.findByRole("button", { name: /History/i }));
    expect(await screen.findByText(/Old note 1/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /Clear history/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Old note 1/i)).not.toBeInTheDocument();
    });
    const stored = JSON.parse(
      window.localStorage.getItem("notesHistory:v-1:note-1.md") ?? "[]"
    ) as Array<{ text: string }>;
    expect(stored).toHaveLength(0);
  });
});
