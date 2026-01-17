import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, it, expect, vi, beforeEach } from "vitest";
import i18n from "@/i18n";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";
import { DetachedProjectsTab } from "./DetachedProjectsTab";

const invokeMock = vi.fn();
const readDirMock = vi.fn();
const removeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  invoke: invokeMock,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: readDirMock,
  remove: removeMock,
  rename: vi.fn(),
}));

const getAllVerticesMock = vi.fn<() => Promise<Vertex[]>>();
const createVertexMock = vi.fn<(vertex: Vertex) => Promise<void>>();

const fsMock = {
  getAllVertices: getAllVerticesMock,
  createVertex: createVertexMock,
};

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => fsMock,
}));

const renderTab = (props?: Partial<React.ComponentProps<typeof DetachedProjectsTab>>) =>
  render(
    <I18nextProvider i18n={i18n}>
      <DetachedProjectsTab
        workspaces={[]}
        onChanged={vi.fn()}
        {...props}
      />
    </I18nextProvider>
  );

describe("DetachedProjectsTab", () => {
  const workspaces: Workspace[] = [
    {
      id: "ws-1",
      name: "Workspace",
      path: "/tmp/ws",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      tags: [],
    },
  ];

  beforeEach(() => {
    invokeMock.mockReset();
    readDirMock.mockReset();
    removeMock.mockReset();
    getAllVerticesMock.mockReset();
    createVertexMock.mockReset();
  });

  it("filters hidden and known directories", async () => {
    getAllVerticesMock.mockImplementation(async () => [
      { id: "known", title: "Known", asset_directory: "", parent_id: null, workspace_id: "ws-1", created_at: "", updated_at: "", tags: [] },
    ]);
    readDirMock.mockResolvedValue([
      { name: ".cache", isDirectory: true, isFile: false, isSymlink: false },
      { name: "known", isDirectory: true, isFile: false, isSymlink: false },
      { name: "detached-1", isDirectory: true, isFile: false, isSymlink: false },
    ]);

    renderTab({ workspaces });

    expect(await screen.findByText(/Detached projects/i)).toBeInTheDocument();
    expect(screen.queryByText(".cache")).not.toBeInTheDocument();
    expect(screen.queryByText("known")).not.toBeInTheDocument();
    expect(screen.getByText("detached-1")).toBeInTheDocument();
  });

  it("opens folder and deletes detached directories", async () => {
    getAllVerticesMock.mockImplementation(async () => []);
    readDirMock.mockResolvedValue([
      { name: "detached-2", isDirectory: true, isFile: false, isSymlink: false },
    ]);

    renderTab({ workspaces });

    await screen.findByText("detached-2");

    fireEvent.click(screen.getByLabelText(/Open folder/i));
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("fs_open_path", {
        path: "/tmp/ws/detached-2",
      });
    });

    fireEvent.click(screen.getByLabelText(/Delete/i));
    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));

    await waitFor(() => {
      expect(removeMock).toHaveBeenCalledWith("/tmp/ws/detached-2", {
        recursive: true,
      });
    });
  });
});
