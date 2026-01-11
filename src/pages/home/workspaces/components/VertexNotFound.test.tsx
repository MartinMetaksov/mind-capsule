import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { VertexNotFound } from "./VertexNotFound";

describe("VertexNotFound", () => {
  it("shows missing id and back action", () => {
    const onBack = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <VertexNotFound missingId="v-missing" onBack={onBack} />
      </I18nextProvider>
    );

    expect(screen.getByText(/Vertex not found/i)).toBeInTheDocument();
    expect(screen.getByText(/v-missing/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/back/i));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
