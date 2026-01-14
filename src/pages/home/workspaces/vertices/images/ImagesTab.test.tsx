import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { ImagesTab } from "./ImagesTab";
import type { Vertex } from "@/core/vertex";
import { Reference } from "@/core/common/reference";

const mockUpdateReferences = vi.fn();

// Mock FileReader for data URLs
class MockFileReader {
  public result: string | ArrayBuffer | null = "data://mock";
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  readAsDataURL() {
    setTimeout(() => this.onload && this.onload(), 0);
  }
}
// @ts-expect-error replace global FileReader for tests
global.FileReader = MockFileReader;

const vertex: Vertex = {
  id: "v-1",
  title: "Vertex",
  asset_directory: "/tmp/assets/v-1",
  parent_id: null,
  workspace_id: "ws-1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  tags: [],
  children_behavior: { child_kind: "item", display: "grid" },
};

describe("ImagesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTab = (override?: Partial<React.ComponentProps<typeof ImagesTab>>) =>
    render(
      <I18nextProvider i18n={i18n}>
        <ImagesTab
          vertex={{ ...vertex, ...(override?.vertex ?? {}) }}
          references={[
            {
              type: "image",
              path: "data://img1",
              alt: "Alt1",
              description: "Desc1",
            } as Reference,
          ]}
          onReferencesUpdated={mockUpdateReferences}
        />
      </I18nextProvider>
    );

  it("renders existing images", () => {
    renderTab();
    expect(screen.getByAltText("Alt1")).toBeInTheDocument();
    expect(screen.getByText("Desc1")).toBeInTheDocument();
  });

  it("opens edit dialog on image click", async () => {
    renderTab();
    fireEvent.click(screen.getByAltText("Alt1"));
    expect(await screen.findByText(/Edit image/i)).toBeInTheDocument();
  });

  it("deletes an image", async () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));
    await waitFor(() => expect(mockUpdateReferences).toHaveBeenCalled());
  });
});
