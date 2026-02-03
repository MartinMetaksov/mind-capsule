import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsDialog } from "./SettingsDialog";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { ThemePreference } from "@/utils/themes/themePreference";

describe("SettingsDialog", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

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

  it("shows general tab content by default", () => {
    renderDialog();
    expect(screen.getByRole("heading", { name: /General/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Control basic UI preferences/i, { selector: "p,span,div" })
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

  it("persists footer toggle changes in local storage", async () => {
    renderDialog();
    const footerToggle = screen.getByLabelText(/Show footer/i);

    fireEvent.click(footerToggle);

    await waitFor(() => {
      expect(
        window.localStorage.getItem("app-setting:ui.showFooter")
      ).toBe("false");
    });
  });

  it("persists tabs collapsed preference changes in local storage", async () => {
    renderDialog();
    const tabsToggle = screen.getByLabelText(/Start tabs collapsed/i);

    fireEvent.click(tabsToggle);

    await waitFor(() => {
      expect(
        window.localStorage.getItem("app-setting:ui.tabsCollapsedDefault")
      ).toBe("true");
    });
  });
});
