import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FileSystem } from "../fileSystem";
import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";

const storeMock = {
  set: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
  keys: vi.fn(async () => [] as string[]),
  delete: vi.fn(async () => true),
};
const loadSpy = vi.fn(async () => storeMock);
const invokeMock = vi.fn();
const readDirMock = vi.fn(async () => []);
const readFileMock = vi.fn();
const writeFileMock = vi.fn();
const removeFileMock = vi.fn();
const joinMock = vi.fn(async (...parts: string[]) => parts.join("/"));

vi.mock("@tauri-apps/plugin-store", () => ({
  Store: {
    load: loadSpy,
  },
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: readDirMock,
  readFile: readFileMock,
  writeFile: writeFileMock,
  remove: removeFileMock,
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: joinMock,
}));

const loadFs = async (): Promise<FileSystem> => {
  vi.resetModules();
  storeMock.set.mockClear();
  storeMock.get.mockClear();
  storeMock.save.mockClear();
  storeMock.keys.mockClear();
  storeMock.delete.mockClear();
  invokeMock.mockReset();
  readDirMock.mockClear();
  readFileMock.mockClear();
  writeFileMock.mockClear();
  removeFileMock.mockClear();
  joinMock.mockClear();
  // default empty store
  storeMock.get.mockResolvedValue(undefined);
  const mod = await import("./fileSystem");
  return mod.fileSystem;
};

const ws: Workspace = {
  id: "ws-1",
  name: "Workspace",
  path: "/tmp/ws",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  tags: [],
};

const vertex: Vertex = {
  id: "v-1",
  title: "Vertex",
  asset_directory: `${ws.path}/v-1`,
  parent_id: null,
  workspace_id: ws.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  tags: [],
  items_behavior: { child_kind: "item", display: "grid" as const },
};

describe("tauri fileSystem bridge", () => {
  beforeEach(() => {
    loadSpy.mockClear();
  });

  it("persists workspaces and invokes create command", async () => {
    const fs = await loadFs();
    await fs.createWorkspace(ws);
    expect(storeMock.set).toHaveBeenCalledWith(
      "workspaces.index.json",
      [{ id: ws.id, path: ws.path }]
    );
    expect(storeMock.save).toHaveBeenCalled();
    expect(invokeMock).toHaveBeenCalledWith("fs_create_workspace", { workspacePath: ws.path });
    expect(writeFileMock).toHaveBeenCalledWith(
      "/tmp/ws/mind-capsule.workspace.json",
      expect.anything()
    );
  });

  it("selectWorkspaceDirectory returns value or null on error", async () => {
    const fs = await loadFs();
    invokeMock.mockResolvedValueOnce("/picked/dir");
    expect(await fs.selectWorkspaceDirectory()).toBe("/picked/dir");
    invokeMock.mockRejectedValueOnce(new Error("fail"));
    expect(await fs.selectWorkspaceDirectory()).toBeNull();
  });

  it("persists vertices and invokes directory commands", async () => {
    const fs = await loadFs();
    await fs.createWorkspace(ws);
    await fs.createVertex(vertex);
    expect(invokeMock).toHaveBeenCalledWith("fs_create_vertex_dir", {
      workspacePath: ws.path,
      vertexId: vertex.id,
    });
    expect(writeFileMock).toHaveBeenCalledWith(
      "/tmp/ws/mind-capsule.workspace.json",
      expect.anything()
    );
    expect(await fs.getVertex(vertex.id)).toEqual(
      expect.objectContaining({ asset_directory: `${ws.path}/${vertex.id}` })
    );
    expect(await fs.getWorkspaceRootVertices(ws.id)).toEqual([vertex]);

    await fs.updateVertex({ ...vertex, title: "Updated" });
    const lastWrite = writeFileMock.mock.calls[writeFileMock.mock.calls.length - 1];
    const encoded = lastWrite[1] as Uint8Array;
    const text = new TextDecoder().decode(encoded);
    expect(text).toMatch(/Updated/);

    await fs.removeVertex(vertex);
    expect(invokeMock).toHaveBeenCalledWith("fs_remove_vertex_dir", {
      workspacePath: ws.path,
      vertexId: vertex.id,
    });
    expect(storeMock.delete).not.toHaveBeenCalledWith(`vert-${vertex.id}.json`);
  });
});
