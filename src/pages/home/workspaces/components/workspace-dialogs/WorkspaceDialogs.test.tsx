import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { WorkspaceDialog, DeleteWorkspaceDialog, WorkspaceFormData } from "./WorkspaceDialogs";

describe("WorkspaceDialog", () => {
  const renderDialog = (props?: Partial<React.ComponentProps<typeof WorkspaceDialog>>) => {
    const onSubmit = vi.fn<(data: WorkspaceFormData) => void>();
    const onPickPath = vi.fn(async () => "/picked/path");
    render(
      <I18nextProvider i18n={i18n}>
        <WorkspaceDialog
          open
          onClose={vi.fn()}
          onSubmit={onSubmit}
          onPickPath={onPickPath}
          {...props}
        />
      </I18nextProvider>
    );
    return { onSubmit, onPickPath };
  };

  it("requires name and path before submit", () => {
    const { onSubmit } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "WS" } });
    fireEvent.change(screen.getByLabelText(/Path/i), { target: { value: "/tmp/ws" } });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "WS", path: "/tmp/ws" })
    );
  });

  it("calls pick path helper", async () => {
    const { onPickPath } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Select directory/i }));
    expect(onPickPath).toHaveBeenCalled();
  });
});

describe("DeleteWorkspaceDialog", () => {
  it("renders delete confirmation and triggers handlers", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <DeleteWorkspaceDialog
          open
          name="Workspace One"
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole("heading", { name: /Delete workspace/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
