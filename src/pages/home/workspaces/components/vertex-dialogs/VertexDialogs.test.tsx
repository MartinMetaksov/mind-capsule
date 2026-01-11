import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { CreateVertexDialog, DeleteVertexDialog } from "./VertexDialogs";

describe("CreateVertexDialog", () => {
  const renderDialog = (props?: Partial<React.ComponentProps<typeof CreateVertexDialog>>) => {
    const onSubmit = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <CreateVertexDialog
          open
          onClose={vi.fn()}
          onSubmit={onSubmit}
          workspaceLabel="Workspace One"
          {...props}
        />
      </I18nextProvider>
    );
    return { onSubmit };
  };

  it("renders fields and requires title", () => {
    const { onSubmit } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "My Vertex" } });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "My Vertex" })
    );
  });
});

describe("DeleteVertexDialog", () => {
  it("renders message and handles confirm/cancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <DeleteVertexDialog
          open
          onCancel={onCancel}
          onConfirm={onConfirm}
          name="Vertex One"
          entityLabel="vertex"
        />
      </I18nextProvider>
    );

    expect(screen.getByRole("heading", { name: /delete vertex/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
