import * as React from "react";

type DragDropPayload = {
  type: "enter" | "over" | "drop" | "leave";
  paths?: string[];
  position?: { x: number; y: number };
};

const IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "tiff",
  "svg",
];

const isImagePath = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext ?? "");
};

const mimeFromPath = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    case "tiff":
      return "image/tiff";
    case "svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
};

const fileNameFromPath = (path: string) =>
  path.split(/[/\\]/).pop() ?? "image";

const isPointInside = (rect: DOMRect, x: number, y: number) => {
  const scale = window.devicePixelRatio || 1;
  const insideLogical =
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  const insidePhysical =
    x >= rect.left * scale &&
    x <= rect.right * scale &&
    y >= rect.top * scale &&
    y <= rect.bottom * scale;
  return insideLogical || insidePhysical;
};

type UseTauriImageDropOptions = {
  containerRef: React.RefObject<HTMLElement | null>;
  onHoverChange: (hovering: boolean) => void;
  onDropFiles: (files: File[]) => void | Promise<void>;
  enabled?: boolean;
};

export const useTauriImageDrop = ({
  containerRef,
  onHoverChange,
  onDropFiles,
  enabled = true,
}: UseTauriImageDropOptions) => {
  React.useEffect(() => {
    let unlisten: (() => void) | undefined;
    let canceled = false;

    const setup = async () => {
      const { isTauri } = await import("@tauri-apps/api/core");
      if (!enabled || !isTauri()) return;
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { readFile } = await import("@tauri-apps/plugin-fs");

      unlisten = await getCurrentWindow().onDragDropEvent(async (event) => {
        if (canceled) return;
        const payload = event.payload as DragDropPayload;
        const pos =
          "position" in payload ? payload.position : undefined;
        const rect = containerRef.current?.getBoundingClientRect();
        const isInside =
          pos && rect ? isPointInside(rect, pos.x, pos.y) : true;

        if (payload.type === "enter" || payload.type === "over") {
          onHoverChange(isInside);
          return;
        }
        if (payload.type === "leave") {
          onHoverChange(false);
          return;
        }
        if (payload.type === "drop") {
          if (!isInside) return;
          onHoverChange(false);
          const paths = (payload.paths ?? []).filter(isImagePath);
          if (paths.length === 0) return;
          const files = await Promise.all(
            paths.map(async (path) => {
              const data = await readFile(path);
              return new File([data], fileNameFromPath(path), {
                type: mimeFromPath(path),
              });
            })
          );
          await onDropFiles(files);
        }
      });
    };

    setup();
    return () => {
      canceled = true;
      unlisten?.();
    };
  }, [containerRef, enabled, onDropFiles, onHoverChange]);
};
