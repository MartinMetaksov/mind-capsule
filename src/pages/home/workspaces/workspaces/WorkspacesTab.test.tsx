import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { WorkspacesTab } from "./WorkspacesTab";
import type { Workspace } from "@/core/workspace";
import { BrowserRouter } from "react-router-dom";

// Mock ResizeObserver for MUI
beforeAll(() => {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
    MockResizeObserver;
});

const workspace: Workspace = {
  id: "ws-1",
  name: "Workspace One",
  path: "/tmp/ws-one",
  purpose: "Test workspace",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

const renderTab = (props?: Partial<React.ComponentProps<typeof WorkspacesTab>>) =>
  render(
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <WorkspacesTab workspaces={[workspace]} onChanged={vi.fn()} {...props} />
      </BrowserRouter>
    </I18nextProvider>
  );

describe("WorkspacesTab", () => {
  it("renders workspace list", () => {
    renderTab();
    expect(screen.getByText("Workspace One")).toBeInTheDocument();
    expect(screen.getByText(workspace.path)).toBeInTheDocument();
  });

  it("opens create dialog when FAB clicked", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Create workspace/i }));
    expect(screen.getByText(/Create workspace/i)).toBeInTheDocument();
  });
});
