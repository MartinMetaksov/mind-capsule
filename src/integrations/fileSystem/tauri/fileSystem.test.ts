import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FileSystem } from "../fileSystem";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";

const storeMock = {
  set: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
};
const loadSpy = vi.fn(async () => storeMock);
const invokeMock = vi.fn();

vi.mock("@tauri-apps/plugin-store", () => ({
  Store: {
    load: loadSpy,
  },
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

const loadFs = async (): Promise<FileSystem> => {
  vi.resetModules();
  storeMock.set.mockClear();
  storeMock.get.mockClear();
  storeMock.save.mockClear();
  invokeMock.mockReset();
  // default empty store
  storeMock.get.mockResolvedValue(undefined);
  const mod = await import("./fileSystem");
  return mod.fileSystem;
};

const ws: Workspace = {
  id: "ws-1",
  name: "Workspace",
  path: "/tmp/ws",
  purpose: "",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  tags: [],
};

const vertex: Vertex = {
  id: "v-1",
  title: "Vertex",
  parent_id: undefined,
  workspace_id: ws.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  tags: [],
  children_behavior: { child_kind: "item", display: "grid" as const },
};

describe("tauri fileSystem bridge", () => {
  beforeEach(() => {
    loadSpy.mockClear();
  });

  it("persists workspaces and invokes create command", async () => {
    const fs = await loadFs();
    await fs.createWorkspace(ws);
    expect(storeMock.set).toHaveBeenCalledWith(
      "tauri.workspaces",
      expect.objectContaining({ [ws.id]: expect.objectContaining({ id: ws.id }) })
    );
    expect(storeMock.save).toHaveBeenCalled();
    expect(invokeMock).toHaveBeenCalledWith("fs_create_workspace", { workspace: expect.any(Object) });
  });

  it("selectWorkspaceDirectory returns value or null on error", async () => {
    const fs = await loadFs();
    invokeMock.mockResolvedValueOnce("/picked/dir");
    expect(await fs.selectWorkspaceDirectory()).toBe("/picked/dir");
    invokeMock.mockRejectedValueOnce(new Error("fail"));
    expect(await fs.selectWorkspaceDirectory()).toBeNull();
  });

  it("delegates vertex operations to invoke", async () => {
    const fs = await loadFs();
    await fs.createVertex(vertex);
    expect(invokeMock).toHaveBeenCalledWith("fs_create_vertex", { vertex });

    invokeMock.mockResolvedValueOnce([vertex]);
    expect(await fs.getVertices("parent")).toEqual([vertex]);
    expect(invokeMock).toHaveBeenCalledWith("fs_get_vertices", { parentId: "parent" });

    invokeMock.mockResolvedValueOnce([vertex]);
    expect(await fs.getWorkspaceRootVertices(ws.id)).toEqual([vertex]);
    expect(invokeMock).toHaveBeenCalledWith("fs_get_root_vertices", { workspaceId: ws.id });

    invokeMock.mockResolvedValueOnce(vertex);
    expect(await fs.getVertex(vertex.id)).toEqual(vertex);
    expect(invokeMock).toHaveBeenCalledWith("fs_get_vertex", { vertexId: vertex.id });

    await fs.updateVertex(vertex);
    expect(invokeMock).toHaveBeenCalledWith("fs_update_vertex", { vertex });

    await fs.removeVertex(vertex);
    expect(invokeMock).toHaveBeenCalledWith("fs_remove_vertex", { vertexId: vertex.id });
  });
});
