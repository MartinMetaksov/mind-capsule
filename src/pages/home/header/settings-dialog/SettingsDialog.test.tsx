import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsDialog } from "./SettingsDialog";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { ThemePreference } from "@/utils/themes/themePreference";

describe("SettingsDialog", () => {
  const renderDialog = (props?: Partial<React.ComponentProps<typeof SettingsDialog>>) =>
    render(
      <I18nextProvider i18n={i18n}>
        <SettingsDialog
          open
          onClose={vi.fn()}
          preference="system"
          onChangePreference={vi.fn()}
          {...props}
        />
      </I18nextProvider>
    );

  it("shows theme tab content by default", () => {
    renderDialog();
    expect(screen.getByRole("heading", { name: /Theme/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Choose how the app looks/i, { selector: "p,span,div" })
    ).toBeInTheDocument();
  });

  it("switches tabs to shortcuts and lists keys", () => {
    renderDialog();
    fireEvent.click(screen.getByText(/Keyboard shortcuts/i));
    expect(screen.getByText(/^Search$/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Settings/i)).toBeInTheDocument();
  });

  it("switches tabs to language and allows selection", () => {
    const onChangePreference = vi.fn<(val: ThemePreference) => void>();
    renderDialog({ onChangePreference });

    fireEvent.click(screen.getByText(/Language/i));
    expect(screen.getByText(/Choose your preferred language/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Language/i)).toBeInTheDocument();
  });
});
