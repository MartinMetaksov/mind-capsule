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

// Mock heavy child dialogs
vi.mock("./SearchDialog", () => ({
  SearchDialog: ({ open }: { open: boolean }) => (open ? <div>Search Dialog</div> : null),
}));
vi.mock("./SettingsDialog", () => ({
  SettingsDialog: ({ open }: { open: boolean }) =>
    open ? <div>Settings Dialog</div> : null,
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
    expect(screen.getByText(/Search Dialog/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Settings/i }));
    expect(screen.getByText(/Settings Dialog/i)).toBeInTheDocument();
  });
});
