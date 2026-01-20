import * as React from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import type { Vertex } from "@/core/vertex";
import { FilesTab } from "./FilesTab";

const mockIsTauri = vi.fn();
const mockInvoke = vi.fn();
const mockReadDir = vi.fn();
const mockRemove = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => mockIsTauri(),
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: async (...parts: string[]) => parts.join("/"),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: (...args: unknown[]) => mockReadDir(...args),
  remove: (...args: unknown[]) => mockRemove(...args),
}));

const vertex: Vertex = {
  id: "v-1",
  title: "Vertex",
  asset_directory: "/tmp/vertex",
  parent_id: null,
  workspace_id: "ws-1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

describe("FilesTab", () => {
  beforeEach(() => {
    mockIsTauri.mockReturnValue(false);
    mockInvoke.mockReset();
    mockReadDir.mockReset();
    mockRemove.mockReset();
  });

  it("renders empty state", async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <FilesTab vertex={vertex} />
      </I18nextProvider>
    );

    expect(screen.getByText(i18n.t("filesTab.title"))).toBeInTheDocument();
    expect(await screen.findByText(i18n.t("filesTab.empty"))).toBeInTheDocument();
  });

  it("lists only supported files", async () => {
    mockIsTauri.mockReturnValue(true);
    mockReadDir.mockResolvedValue([
      { name: "report.pdf", isDirectory: false },
      { name: "photo.png", isDirectory: false },
      { name: "notes.md", isDirectory: false },
      { name: ".hidden", isDirectory: false },
      { name: "archive.zip", isDirectory: false },
      { name: "folder", isDirectory: true },
    ]);

    render(
      <I18nextProvider i18n={i18n}>
        <FilesTab vertex={vertex} />
      </I18nextProvider>
    );

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("archive.zip")).toBeInTheDocument();
    expect(screen.queryByText("photo.png")).not.toBeInTheDocument();
    expect(screen.queryByText("notes.md")).not.toBeInTheDocument();
  });

  it("opens and deletes files", async () => {
    mockIsTauri.mockReturnValue(true);
    mockReadDir.mockResolvedValue([
      { name: "report.pdf", isDirectory: false },
    ]);

    render(
      <I18nextProvider i18n={i18n}>
        <FilesTab vertex={vertex} />
      </I18nextProvider>
    );

    await screen.findByText("report.pdf");
    const openButtons = screen.getAllByLabelText(i18n.t("filesTab.open"));
    fireEvent.click(openButtons[0]);
    await screen.findByText("report.pdf");
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("fs_open_path", {
        path: "/tmp/vertex/report.pdf",
      });
    });

    const deleteButtons = screen.getAllByLabelText(i18n.t("commonActions.delete"));
    fireEvent.click(deleteButtons[0]);

    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", {
      name: i18n.t("commonActions.delete"),
    });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalled();
    });
    expect(mockRemove.mock.calls[0]?.[0]).toBe("/tmp/vertex/report.pdf");
  });
});
