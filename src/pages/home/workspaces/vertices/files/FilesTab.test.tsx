import * as React from "react";
import { render, screen } from "@testing-library/react";
import { FilesTab } from "./FilesTab";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

describe("FilesTab", () => {
  it("renders placeholder content", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <FilesTab />
      </I18nextProvider>
    );
    expect(screen.getByText(/Files/i)).toBeInTheDocument();
    expect(screen.getByText(/References of type file/i)).toBeInTheDocument();
  });
});
