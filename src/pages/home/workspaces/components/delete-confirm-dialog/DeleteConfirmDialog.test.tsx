import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

describe("DeleteConfirmDialog", () => {
  const renderDialog = (props?: Partial<React.ComponentProps<typeof DeleteConfirmDialog>>) => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <DeleteConfirmDialog
          open
          title="Delete item"
          message="Are you sure?"
          onCancel={onCancel}
          onConfirm={onConfirm}
          {...props}
        />
      </I18nextProvider>
    );
    return { onCancel, onConfirm };
  };

  it("renders title and message", () => {
    renderDialog();
    expect(screen.getByText("Delete item")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("calls confirm and cancel on button clicks", () => {
    const { onCancel, onConfirm } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
