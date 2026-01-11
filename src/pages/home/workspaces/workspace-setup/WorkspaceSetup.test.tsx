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
    expect(screen.getByRole("button", { name: /Choose workspace folder/i })).toBeInTheDocument();
  });

  it("picks a workspace directory and creates workspace", async () => {
    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /Choose workspace folder/i }));
    await waitFor(() => expect(mockSelectWorkspaceDirectory).toHaveBeenCalled());
    await waitFor(() => expect(mockCreateWorkspace).toHaveBeenCalled());
  });

  it("creates default workspace when quick start clicked", async () => {
    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /Create default workspace/i }));
    await waitFor(() => expect(mockCreateWorkspace).toHaveBeenCalled());
  });
});
