import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { WorkspaceSetup } from "./WorkspaceSetup";

const mockCreateWorkspace = vi.fn();
const mockSelectWorkspaceDirectory = vi.fn();

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    selectWorkspaceDirectory: mockSelectWorkspaceDirectory,
    createWorkspace: mockCreateWorkspace,
  }),
}));

describe("WorkspaceSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectWorkspaceDirectory.mockResolvedValue("/tmp/new-ws");
    mockCreateWorkspace.mockResolvedValue(undefined);
  });

  const renderSetup = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <WorkspaceSetup />
      </I18nextProvider>
    );

  it("renders welcome content", () => {
    renderSetup();
    expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Attach workspace/i })).toBeInTheDocument();
  });

  it("creates a workspace from the dialog", async () => {
    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /Attach workspace/i }));
    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: "New Workspace" },
    });
    fireEvent.change(screen.getByLabelText(/Path/i), {
      target: { value: "/tmp/new-ws" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Attach$/i }));
    await waitFor(() => expect(mockCreateWorkspace).toHaveBeenCalled());
  });
});
