import * as React from "react";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import type { Vertex } from "@/core/vertex";
import { FilesTab } from "./FilesTab";

const vertex: Vertex = {
  id: "v-1",
  title: "Vertex",
  asset_directory: "/tmp/vertex",
  parent_id: null,
  workspace_id: "ws-1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
};

describe("FilesTab", () => {
  it("renders placeholder content", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <FilesTab vertex={vertex} />
      </I18nextProvider>
    );

    expect(screen.getByText(i18n.t("filesTab.title"))).toBeInTheDocument();
  });
});
