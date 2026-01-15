import * as React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { ImagesTab } from "./ImagesTab";
import type { Vertex } from "@/core/vertex";

const mockListImages = vi.fn();
const mockDeleteImage = vi.fn();
const mockUpdateImageMetadata = vi.fn();
const mockCreateImage = vi.fn();

vi.mock("@/integrations/fileSystem/integration", () => ({
  getFileSystem: async () => ({
    listImages: mockListImages,
    deleteImage: mockDeleteImage,
    updateImageMetadata: mockUpdateImageMetadata,
    createImage: mockCreateImage,
  }),
}));

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
    mockListImages.mockResolvedValue([
      {
        name: "img1.png",
        path: "data://img1",
        alt: "Alt1",
        description: "Desc1",
      },
    ]);
    mockDeleteImage.mockResolvedValue(undefined);
    mockUpdateImageMetadata.mockResolvedValue({
      name: "img1.png",
      path: "data://img1",
      alt: "Alt1",
      description: "Desc1",
    });
  });

  const renderTab = (override?: Partial<React.ComponentProps<typeof ImagesTab>>) =>
    render(
      <I18nextProvider i18n={i18n}>
        <ImagesTab
          vertex={{ ...vertex, ...(override?.vertex ?? {}) }}
        />
      </I18nextProvider>
    );

  it("renders existing images", async () => {
    renderTab();
    expect(await screen.findByAltText("Alt1")).toBeInTheDocument();
    expect(await screen.findByText("Desc1")).toBeInTheDocument();
  });

  it("opens edit dialog on image click", async () => {
    renderTab();
    fireEvent.click(await screen.findByAltText("Alt1"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/Alt text/i)).toBeInTheDocument();
  });

  it("deletes an image", async () => {
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: /Delete/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Delete/i }));
    await waitFor(() => expect(mockDeleteImage).toHaveBeenCalledWith(vertex, "img1.png"));
  });
});
