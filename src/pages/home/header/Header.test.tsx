import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { Header } from "./Header";

// Mock theme mode hook
vi.mock("@/utils/themes/hooks/useThemeMode", () => ({
  useThemeMode: () => ({
    preference: "system",
    setPreference: vi.fn(),
  }),
}));

vi.mock("@/utils/os", () => ({
  detectOperatingSystem: () => "macOS",
}));

// Mock heavy child dialogs (note: path reflects header folder structure)
vi.mock("./search-dialog/SearchDialog", () => ({
  SearchDialog: ({ open }: { open: boolean }) => (
    <div data-testid="search-dialog">{open ? "search-open" : "search-closed"}</div>
  ),
}));
vi.mock("./settings-dialog/SettingsDialog", () => ({
  SettingsDialog: ({ open }: { open: boolean }) =>
    open ? <div>Settings Dialog</div> : <div data-testid="settings-dialog">settings-closed</div>,
}));

describe("Header", () => {
  it("renders app name and opens search/settings dialogs", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      </I18nextProvider>
    );

    expect(screen.getByText(/Mind Capsule/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Search/i }));
    expect(screen.getByTestId("search-dialog")).toHaveTextContent("search-open");

    fireEvent.click(screen.getByRole("button", { name: /Settings/i }));
    expect(screen.getByText(/Settings Dialog/i)).toBeInTheDocument();
  });

  it("toggles compare view via keyboard shortcut", () => {
    const onToggleSplit = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <Header onToggleSplit={onToggleSplit} />
        </BrowserRouter>
      </I18nextProvider>
    );

    fireEvent.keyDown(window, { key: "e", metaKey: true });
    expect(onToggleSplit).toHaveBeenCalledTimes(1);
  });
});
