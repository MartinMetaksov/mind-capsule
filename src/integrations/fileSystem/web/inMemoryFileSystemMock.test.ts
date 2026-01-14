import { Vertex } from "@/core/vertex";
import { assetStorageKey } from "./storageKeys";
import { describe, it, expect, beforeEach, vi } from "vitest";

const loadMock = async () => {
  vi.resetModules();
  localStorage.clear();
  // ensure no seed applied
  window.history.replaceState({}, "", "/");
  const mod = await import("./inMemoryFileSystemMock");
  return mod.inMemoryFileSystemMock;
};

describe("inMemoryFileSystemMock", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates and retrieves a workspace", async () => {
    const fs = await loadMock();
    const ws = {
      id: "ws-1",
      name: "Workspace",
      path: "/tmp/ws",
      purpose: "test",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      tags: [],
    };
    await fs.createWorkspace(ws);
    expect(await fs.getWorkspace(ws.id)).toEqual(ws);
    expect((await fs.getWorkspaces()).length).toBe(1);
  });

  it("prevents duplicate workspaces", async () => {
    const fs = await loadMock();
    const ws = {
      id: "ws-dup",
      name: "Dup",
      path: "/tmp/dup",
      purpose: "",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      tags: [],
    };
    await fs.createWorkspace(ws);
    await expect(fs.createWorkspace(ws)).rejects.toThrow(/already exists/);
  });

  it("creates, updates, and removes vertices", async () => {
    const fs = await loadMock();
    const ws = {
      id: "ws-vertex",
      name: "Workspace",
      path: "/tmp/ws",
      purpose: "",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      tags: [],
    };
    await fs.createWorkspace(ws);
    const vertex: Vertex = {
      id: "v-1",
      title: "Root",
      asset_directory: assetStorageKey("v-1"),
      parent_id: null,
      workspace_id: ws.id,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      tags: [],
      children_behavior: { child_kind: "item", display: "grid" },
    };
    await fs.createVertex(vertex);
    expect(await fs.getVertex(vertex.id)).toEqual(vertex);
    expect(await fs.getWorkspaceRootVertices(ws.id)).toEqual([vertex]);

    const updated = { ...vertex, title: "Updated" };
    await fs.updateVertex(updated);
    expect((await fs.getVertex(vertex.id))?.title).toBe("Updated");

    await fs.removeVertex(updated);
    expect(await fs.getVertex(vertex.id)).toBeNull();
  });
});
