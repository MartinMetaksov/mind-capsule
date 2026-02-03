import * as React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";

import type { ImageEntry, NoteEntry } from "@/integrations/fileSystem/fileSystem";
import { useWorkspaces } from "./workspaces/hooks/use-workspaces/useWorkspaces";
import { useVertices } from "./workspaces/hooks/use-vertices/useVertices";
import type { VertexItem } from "./workspaces/vertex-overview/views/grid/VertexGrid";
import { GraphReferenceModal } from "./workspaces/vertex-overview/views/graph/components/GraphReferenceModal";
import { renderMarkdown } from "./workspaces/vertex-overview/vertices/notes/utils/markdown";
import { getFileSystem } from "@/integrations/fileSystem/integration";

type NotePreview = {
  title: string;
  text: string;
};

type ImagePreview = {
  title: string;
  path: string;
};

export const SplitGraphPanel: React.FC = () => {
  const { workspaces } = useWorkspaces();
  const { vertices, workspaceByVertexId } = useVertices(workspaces);
  const { t } = useTranslation("common");
  const [notePreview, setNotePreview] = React.useState<NotePreview | null>(null);
  const [imagePreview, setImagePreview] = React.useState<ImagePreview | null>(
    null
  );
  const [pendingImage, setPendingImage] = React.useState<{
    vertexId: string;
    imageName: string;
  } | null>(null);
  const [pendingNote, setPendingNote] = React.useState<{
    vertexId: string;
    noteName: string;
  } | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const resizeFrameRef = React.useRef<number | null>(null);
  const lastSizeRef = React.useRef({ width: 0, height: 0 });
  const [layoutKey, setLayoutKey] = React.useState(0);

  const items = React.useMemo<VertexItem[]>(() => {
    const next: VertexItem[] = [];
    for (const v of vertices) {
      const ws = workspaceByVertexId[v.id];
      if (!ws) continue;
      next.push({ vertex: v, workspace: ws });
    }
    return next;
  }, [vertices, workspaceByVertexId]);

  const attemptOpenImage = React.useCallback(
    async (vertexId: string, imageName: string) => {
      try {
        const fs = await getFileSystem();
        const targetVertex = await fs.getVertex(vertexId);
        if (!targetVertex) {
          setPendingImage(null);
          return;
        }
        const image = await fs.getImage(targetVertex, imageName);
        if (!image) {
          setPendingImage(null);
          return;
        }
        setPendingImage(null);
        try {
          window.sessionStorage.removeItem("splitScreen.compareImage");
        } catch {
          // ignore storage failures
        }
        setNotePreview(null);
        setImagePreview({
          title: image.alt || image.name,
          path: image.path,
        });
      } catch {
        setPendingImage((prev) =>
          prev?.vertexId === vertexId && prev.imageName === imageName
            ? prev
            : { vertexId, imageName }
        );
      }
    },
    []
  );

  const attemptOpenNote = React.useCallback(
    async (vertexId: string, noteName: string) => {
      try {
        const fs = await getFileSystem();
        const targetVertex = await fs.getVertex(vertexId);
        if (!targetVertex) {
          setPendingNote(null);
          return;
        }
        const note = await fs.getNote(targetVertex, noteName);
        if (!note) {
          setPendingNote(null);
          return;
        }
        setPendingNote(null);
        try {
          window.sessionStorage.removeItem("splitScreen.compareNote");
        } catch {
          // ignore storage failures
        }
        setImagePreview(null);
        setNotePreview({
          title: note.name.replace(/\.md$/i, ""),
          text: note.text ?? "",
        });
      } catch {
        setPendingNote((prev) =>
          prev?.vertexId === vertexId && prev.noteName === noteName
            ? prev
            : { vertexId, noteName }
        );
      }
    },
    []
  );

  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{ vertexId?: string; imageName?: string }>
      ).detail;
      const vertexId = detail?.vertexId;
      const imageName = detail?.imageName;
      if (!vertexId || !imageName) return;
      void attemptOpenImage(vertexId, imageName);
    };
    window.addEventListener("split-screen-compare-image", handler);
    return () =>
      window.removeEventListener("split-screen-compare-image", handler);
  }, [attemptOpenImage]);

  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{ vertexId?: string; noteName?: string }>
      ).detail;
      const vertexId = detail?.vertexId;
      const noteName = detail?.noteName;
      if (!vertexId || !noteName) return;
      void attemptOpenNote(vertexId, noteName);
    };
    window.addEventListener("split-screen-compare-note", handler);
    return () =>
      window.removeEventListener("split-screen-compare-note", handler);
  }, [attemptOpenNote]);

  React.useEffect(() => {
    if (!pendingImage) return;
    void attemptOpenImage(pendingImage.vertexId, pendingImage.imageName);
  }, [attemptOpenImage, pendingImage]);

  React.useEffect(() => {
    if (!pendingNote) return;
    void attemptOpenNote(pendingNote.vertexId, pendingNote.noteName);
  }, [attemptOpenNote, pendingNote]);

  React.useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("splitScreen.compareImage");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        vertexId?: string;
        imageName?: string;
      };
      if (parsed.vertexId && parsed.imageName) {
        void attemptOpenImage(parsed.vertexId, parsed.imageName);
      }
    } catch {
      // ignore storage failures
    }
  }, [attemptOpenImage]);

  React.useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("splitScreen.compareNote");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        vertexId?: string;
        noteName?: string;
      };
      if (parsed.vertexId && parsed.noteName) {
        void attemptOpenNote(parsed.vertexId, parsed.noteName);
      }
    } catch {
      // ignore storage failures
    }
  }, [attemptOpenNote]);

  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const last = lastSizeRef.current;
      if (Math.abs(last.width - width) < 1 && Math.abs(last.height - height) < 1) {
        return;
      }
      lastSizeRef.current = { width, height };
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      resizeFrameRef.current = requestAnimationFrame(() => {
        setLayoutKey((key) => key + 1);
      });
    });
    observer.observe(panel);
    return () => {
      observer.disconnect();
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
    };
  }, []);

  const handleSelectNote = React.useCallback((note: NoteEntry) => {
    setNotePreview({
      title: note.name.replace(/\.md$/i, ""),
      text: note.text ?? "",
    });
  }, []);

  const handleSelectImage = React.useCallback((image: ImageEntry) => {
    setImagePreview({
      title: image.alt || image.name,
      path: image.path,
    });
  }, []);

  const previewTitle = notePreview?.title ?? imagePreview?.title ?? "";
  const handleClosePreview = () => {
    setNotePreview(null);
    setImagePreview(null);
  };

  return (
    <Box
      ref={panelRef}
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <GraphReferenceModal
        key={layoutKey}
        open
        items={items}
        onClose={() => undefined}
        onSelectNote={(note) => handleSelectNote(note)}
        onSelectImage={(image) => handleSelectImage(image)}
        actionKeys={["link-note", "link-image"]}
        actionLabelOverrides={{
          "link-note": t("splitScreen.compareNote"),
          "link-image": t("splitScreen.compareImage"),
        }}
        railSubtitleOverride={t("splitScreen.pickToCompare")}
        railEmptySelectOverride={t("splitScreen.selectVertexToCompare")}
        showHeader={false}
        showCloseButton={false}
        enableEscapeClose={false}
      />
      {(notePreview || imagePreview) && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 9,
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.default",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1.25,
              height: 48,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {previewTitle}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <IconButton onClick={handleClosePreview} aria-label="Close preview">
              <CloseIcon />
            </IconButton>
          </Box>
          {notePreview ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                p: 2,
                color: "text.primary",
                "& h1,h2,h3,h4,h5,h6": { margin: "0.5em 0 0.25em" },
                "& p": { margin: "0.25em 0" },
                "& .broken-link-indicator": {
                  color: "error.main",
                  fontWeight: 600,
                  fontSize: "0.85em",
                },
              }}
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(notePreview.text || ""),
              }}
            />
          ) : (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 2,
              }}
            >
              {imagePreview && (
                <Box
                  component="img"
                  src={imagePreview.path}
                  alt={imagePreview.title}
                  sx={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
