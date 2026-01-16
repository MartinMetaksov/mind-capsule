import * as React from "react";
import { render, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { useWorkspaces } from "./useWorkspaces";
import type { Workspace } from "@/core/workspace";

const workspace: Workspace = {
  id: "ws-1",
  name: "WS One",
  path: "/tmp/ws-one",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    getWorkspaces: async () => [workspace],
  }),
}));

type UseWorkspacesResult = ReturnType<typeof useWorkspaces>;

function HookHarness({
  onUpdate,
}: {
  onUpdate: (value: UseWorkspacesResult) => void;
}) {
  const value = useWorkspaces();
  React.useEffect(() => {
    onUpdate(value);
  }, [value, onUpdate]);
  return null;
}

describe("useWorkspaces", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads workspaces from filesystem", async () => {
    let latest: UseWorkspacesResult | null = null;
    render(
      <I18nextProvider i18n={i18n}>
        <HookHarness onUpdate={(v) => (latest = v)} />
      </I18nextProvider>
    );

    await waitFor(() => expect(latest?.loading).toBe(false));
    expect(latest!.workspaces).toEqual([workspace]);
    expect(latest!.error).toBeNull();
  });
});
