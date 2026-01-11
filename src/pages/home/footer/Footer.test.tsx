import * as React from "react";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { APP_NAME } from "@/constants/appConstants";

describe("Footer", () => {
  it("renders copyright and links", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Footer />
      </I18nextProvider>
    );

    expect(screen.getByText(new RegExp(APP_NAME, "i"))).toBeInTheDocument();
    expect(screen.getByText(/GitHub/i)).toHaveAttribute("href");
    expect(screen.getByText(/License/i)).toHaveAttribute("href");
  });
});
