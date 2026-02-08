import * as React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { NotesTab } from "./NotesTab";
import type { Vertex } from "@/core/vertex";
import { useMediaQuery } from "@mui/material";

// Mock ResizeObserver for layout calculations
beforeAll(() => {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (
    globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }
  ).ResizeObserver = MockResizeObserver;
});

const mockListNotes = vi.fn();
const mockCreateNote = vi.fn();
const mockUpdateNote = vi.fn();
const mockDeleteNote = vi.fn();
const mockUpdateVertex = vi.fn();
const mockGetVertex = vi.fn();
const mockGetNote = vi.fn();
const mockGetImage = vi.fn();
const mockIsTauri = vi.fn();
const mockInvoke = vi.fn();
const mockReadDir = vi.fn();
const mockJoin = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => mockIsTauri(),
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: (...args: unknown[]) => mockReadDir(...args),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: (...args: string[]) => mockJoin(...args),
}));

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    listNotes: mockListNotes,
    createNote: mockCreateNote,
    updateNote: mockUpdateNote,
    deleteNote: mockDeleteNote,
    updateVertex: mockUpdateVertex,
    getVertex: mockGetVertex,
    getNote: mockGetNote,
    getImage: mockGetImage,
  }),
}));

vi.mock("@mui/material", async () => {
  const actual = await vi.importActual<typeof import("@mui/material")>(
    "@mui/material"
  );
  return {
    ...actual,
    useMediaQuery: vi.fn(),
  };
});

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
    vi.mocked(useMediaQuery).mockReturnValue(false);
    window.localStorage.clear();
    mockIsTauri.mockResolvedValue(false);
    mockJoin.mockImplementation(async (...parts: string[]) => parts.join("/"));
    mockListNotes.mockResolvedValue([
      { name: "note-1.md", text: "First note" },
    ]);
    mockCreateNote.mockResolvedValue({ name: "note-2.md", text: "" });
    mockUpdateNote.mockResolvedValue({ name: "note-1.md", text: "Updated note" });
    mockDeleteNote.mockResolvedValue(undefined);
    mockGetVertex.mockImplementation(async (id: string) =>
      id
        ? { ...vertex, id, asset_directory: `/tmp/assets/${id}` }
        : null
    );
    mockGetNote.mockResolvedValue(null);
    mockGetImage.mockResolvedValue(null);
    mockReadDir.mockResolvedValue([]);
  });

  const renderTab = (override?: Partial<React.ComponentProps<typeof NotesTab>>) =>
    render(
      <I18nextProvider i18n={i18n}>
        <NotesTab
          vertex={{ ...vertex, ...(override?.vertex ?? {}) }}
          onOpenVertex={override?.onOpenVertex}
        />
      </I18nextProvider>
    );

  it("renders note cards and opens a note", async () => {
    renderTab();
    expect(await screen.findByText(/First note/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/First note/i));
    expect(await screen.findByRole("button", { name: /Preview/i })).toBeInTheDocument();
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

  it("opens vertex links from preview", async () => {
    const onOpenVertex = vi.fn();
    mockListNotes.mockResolvedValueOnce([
      {
        name: "note-1.md",
        text: "[My Vertex](mindcapsule://vertex/v-2)",
      },
    ]);
    mockGetVertex.mockResolvedValueOnce({ ...vertex, id: "v-2" });
    renderTab({ onOpenVertex });
    fireEvent.click(await screen.findByText(/My Vertex/i));
    const link = await screen.findByRole("link", { name: "My Vertex" });
    fireEvent.click(link);
    expect(onOpenVertex).toHaveBeenCalledWith("v-2");
  });

  it("marks broken links in preview", async () => {
    mockListNotes.mockResolvedValueOnce([
      {
        name: "note-1.md",
        text: "[Missing](mindcapsule://vertex/v-404)",
      },
    ]);
    mockGetVertex.mockResolvedValueOnce(null);
    renderTab();
    fireEvent.click(await screen.findByText(/Missing/i));
    expect(await screen.findByText("[N/A]")).toBeInTheDocument();
  });

  it("opens image links in a full-screen preview", async () => {
    mockListNotes.mockResolvedValueOnce([
      {
        name: "note-1.md",
        text: "[Photo](mindcapsule://image/v-2/photo.jpg)",
      },
    ]);
    mockGetVertex.mockResolvedValueOnce({ ...vertex, id: "v-2" });
    mockGetImage.mockResolvedValue({
      name: "photo.jpg",
      path: "/tmp/assets/v-2/photo.jpg",
      alt: "Photo",
    });
    renderTab();
    fireEvent.click(await screen.findByText(/Photo/i));
    fireEvent.click(await screen.findByRole("link", { name: "Photo" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Photo" })).toBeInTheDocument();
  });

  it("opens note links in a full-screen preview", async () => {
    mockListNotes.mockResolvedValueOnce([
      {
        name: "note-1.md",
        text: "[Other note](mindcapsule://note/v-2/other.md)",
      },
    ]);
    mockGetVertex.mockResolvedValueOnce({ ...vertex, id: "v-2" });
    mockGetNote.mockResolvedValue({
      name: "other.md",
      text: "# Heading",
    });
    renderTab();
    fireEvent.click(await screen.findByText(/Other note/i));
    fireEvent.click(await screen.findByRole("link", { name: "Other note" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Heading/i)).toBeInTheDocument();
  });

  it("opens file links using the OS handler", async () => {
    mockListNotes.mockResolvedValueOnce([
      {
        name: "note-1.md",
        text: "[Report](mindcapsule://file/v-2/report.pdf)",
      },
    ]);
    mockIsTauri.mockResolvedValue(true);
    mockGetVertex.mockResolvedValueOnce({ ...vertex, id: "v-2" });
    mockReadDir.mockResolvedValue([{ name: "report.pdf", isDirectory: false }]);
    renderTab();
    fireEvent.click(await screen.findByText(/Report/i));
    fireEvent.click(await screen.findByRole("link", { name: "Report" }));
    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("fs_open_path", {
        path: "/tmp/assets/v-2/report.pdf",
      })
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

  it("opens the containing folder for a note", async () => {
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: /Open folder/i }));
    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("fs_open_path", {
        path: `${vertex.asset_directory}/note-1.md`,
      })
    );
  });

  it("dispatches compare events for a note", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    renderTab();
    fireEvent.click(
      await screen.findByRole("button", { name: /Select for comparison/i })
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "split-screen-open" })
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "split-screen-compare-note",
        detail: { vertexId: vertex.id, noteName: "note-1.md" },
      })
    );
  });

  it("hides compare actions on mobile", async () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);
    renderTab();
    expect(
      screen.queryByRole("button", { name: /Select for comparison/i })
    ).not.toBeInTheDocument();
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

  it("closes the editor on Escape and restores the create button", async () => {
    renderTab();
    fireEvent.click(await screen.findByText(/First note/i));
    expect(await screen.findByRole("button", { name: /Preview/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New note/i })).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Preview/i })).not.toBeInTheDocument();
    }, { timeout: 2000 });
    expect(await screen.findByRole("button", { name: /New note/i })).toBeInTheDocument();
  });
});
