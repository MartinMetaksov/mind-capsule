import * as React from "react";
import { render, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { useVertices } from "./useVertices";
import type { Workspace } from "@/core/workspace";
import type { Vertex } from "@/core/vertex";

type UseVerticesResult = ReturnType<typeof useVertices>;

const workspace: Workspace = {
  id: "ws-1",
  name: "WS One",
  path: "/tmp/ws-one",
  purpose: "Test",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

const rootVertex: Vertex = {
  id: "v-1",
  title: "Root Vertex",
  asset_directory: "/tmp/assets/v-1",
  parent_id: null,
  workspace_id: workspace.id,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  children_behavior: { child_kind: "item", display: "grid" },
};

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    getWorkspaceRootVertices: async (wsId: string) =>
      wsId === workspace.id ? [rootVertex] : [],
  }),
}));

function HookHarness({
  workspaces,
  onUpdate,
}: {
  workspaces?: Workspace[];
  onUpdate: (value: UseVerticesResult) => void;
}) {
  const value = useVertices(workspaces);
  React.useEffect(() => {
    onUpdate(value);
  }, [value, onUpdate]);
  return null;
}

describe("useVertices", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty state when no workspaces", async () => {
    let latest: UseVerticesResult | null = null;
    render(
      <I18nextProvider i18n={i18n}>
        <HookHarness onUpdate={(v) => (latest = v)} />
      </I18nextProvider>
    );

    await waitFor(() => expect(latest?.loading).toBe(false));
    expect(latest!.vertices).toEqual([]);
    expect(latest!.workspaceByVertexId).toEqual({});
    expect(latest!.error).toBeNull();
  });

  it("loads root vertices for provided workspaces", async () => {
    let latest: UseVerticesResult | null = null;
    render(
      <I18nextProvider i18n={i18n}>
        <HookHarness
          workspaces={[workspace]}
          onUpdate={(v) => (latest = v)}
        />
      </I18nextProvider>
    );

    await waitFor(() => expect(latest?.loading).toBe(false));
    expect(latest!.vertices).toEqual([rootVertex]);
    expect(latest!.workspaceByVertexId[rootVertex.id]).toEqual(workspace);
    expect(latest!.error).toBeNull();
  });
});
