import * as React from "react";
import {
  Alert,
  Box,
  IconButton,
  useMediaQuery,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import HistoryIcon from "@mui/icons-material/History";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import { useTranslation } from "react-i18next";

import type { Vertex } from "@/core/vertex";
import type {
  ImageEntry,
  NoteEntry,
} from "@/integrations/fileSystem/fileSystem";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { DeleteConfirmDialog } from "../../../components/delete-confirm-dialog/DeleteConfirmDialog";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { CreateFab } from "../../../components/create-fab/CreateFab";
import type { GraphNode } from "../../views/graph/types";
import type { VertexItem } from "../../views/grid/VertexGrid";
import { GraphReferenceOverlay } from "../../common/GraphReferenceOverlay";
import { NoteHistoryPanel } from "./components/NoteHistoryPanel";
import { ImagePreviewDialog } from "./components/ImagePreviewDialog";
import { NotePreviewDialog } from "./components/NotePreviewDialog";
import { renderMarkdown, type BrokenLinkMap } from "./utils/markdown";
import {
  loadHistory,
  saveHistory,
  type NoteHistoryItem,
} from "./utils/history";
import { ReorderableGrid } from "../../common/ReorderableGrid";

type NotesTabProps = {
  vertex: Vertex;
  refreshToken?: number;
  onOpenVertex?: (vertexId: string) => void;
};

type Mode = "preview" | "edit";

type NotePreview = {
  title: string;
  text: string;
};

type ImagePreview = {
  title: string;
  path: string;
};

const REORDER_END_ID = "__end__";

const buildOrderMap = (items: NoteEntry[]) =>
  Object.fromEntries(items.map((item, index) => [item.name, index]));

const sortNotes = (items: NoteEntry[], orderMap: Record<string, number>) => {
  return [...items].sort((a, b) => {
    const aOrder = orderMap[a.name];
    const bOrder = orderMap[b.name];
    if (aOrder === undefined && bOrder === undefined) {
      return a.name.localeCompare(b.name);
    }
    if (aOrder === undefined) return 1;
    if (bOrder === undefined) return -1;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });
};

const moveItem = (items: NoteEntry[], sourceId: string, targetId: string) => {
  const fromIndex = items.findIndex((item) => item.name === sourceId);
  if (fromIndex < 0) return items;
  if (targetId === REORDER_END_ID) {
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.push(moved);
    return next;
  }
  const toIndex = items.findIndex((item) => item.name === targetId);
  if (toIndex < 0 || fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

export const NotesTab: React.FC<NotesTabProps> = ({
  vertex,
  refreshToken,
  onOpenVertex,
}) => {
  const { t } = useTranslation("common");
  const [notes, setNotes] = React.useState<NoteEntry[]>([]);
  const [selectedName, setSelectedName] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<Mode>("preview");
  const [draft, setDraft] = React.useState("");
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [referenceOpen, setReferenceOpen] = React.useState(false);
  const [referenceClosing, setReferenceClosing] = React.useState(false);
  const [historyMap, setHistoryMap] = React.useState<Record<string, NoteHistoryItem[]>>({});
  const [brokenLinks, setBrokenLinks] = React.useState<BrokenLinkMap>({});
  const [imagePreview, setImagePreview] = React.useState<ImagePreview | null>(null);
  const [notePreview, setNotePreview] = React.useState<NotePreview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [loading, setLoading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<NoteEntry | null>(null);
  const [notesOrderMap, setNotesOrderMap] = React.useState<Record<string, number>>(
    {}
  );
  const [isClosing, setIsClosing] = React.useState(false);
  const closeTimerRef = React.useRef<number | null>(null);
  const referenceCloseTimerRef = React.useRef<number | null>(null);
  const hasLoadedRef = React.useRef(false);
  const editorRef = React.useRef<HTMLTextAreaElement | null>(null);
  const assetDirectory = vertex.asset_directory;
  const os = React.useMemo(() => detectOperatingSystem(), []);
  const graphItems = React.useMemo<VertexItem[]>(() => [], []);

  const selectedNote = selectedName
    ? notes.find((note) => note.name === selectedName) ?? null
    : null;

  const selectedNoteIndex = React.useMemo(() => {
    if (!selectedNote) return -1;
    return notes.findIndex((note) => note.name === selectedNote.name);
  }, [notes, selectedNote]);

  const selectedNoteLabel = React.useMemo(() => {
    if (!selectedNote) return "";
    if (selectedNoteIndex >= 0) {
      return t("notesTab.noteLabel", { number: selectedNoteIndex + 1 });
    }
    return selectedNote.name;
  }, [selectedNote, selectedNoteIndex, t]);

  const orderKey = React.useMemo(
    () => `notesTab.order:${vertex.id}`,
    [vertex.id]
  );

  React.useEffect(() => {
    if (vertex.notes_layout?.mode === "linear") {
      setNotesOrderMap(vertex.notes_layout.order ?? {});
      return;
    }
    if (typeof window === "undefined") {
      setNotesOrderMap({});
      return;
    }
    const stored = window.sessionStorage.getItem(orderKey);
    if (!stored) {
      setNotesOrderMap({});
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Record<string, number>;
      setNotesOrderMap(parsed ?? {});
    } catch {
      setNotesOrderMap({});
    }
  }, [orderKey, vertex.notes_layout]);

  const orderedNotes = React.useMemo(
    () => sortNotes(notes, notesOrderMap),
    [notes, notesOrderMap]
  );

  const noteHistory = selectedNote
    ? historyMap[selectedNote.name] ?? []
    : [];

  React.useEffect(() => {
    const loadNotes = async () => {
      const isRefresh = hasLoadedRef.current;
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const fs = await getFileSystem();
        const list = await fs.listNotes(vertex);
        setNotes(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("notesTab.errors.save"));
        setNotes([]);
      } finally {
        if (!isRefresh) setLoading(false);
        hasLoadedRef.current = true;
      }
    };
    loadNotes();
  }, [refreshToken, t, vertex]);

  const ensureHistoryLoaded = React.useCallback(
    (note: NoteEntry) => {
      if (historyMap[note.name]) return;
      const stored = loadHistory(vertex.id, note.name);
      setHistoryMap((prev) => ({ ...prev, [note.name]: stored }));
    },
    [historyMap, vertex.id]
  );

  const handleOpenNote = React.useCallback(
    (note: NoteEntry) => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setIsClosing(false);
      setSelectedName(note.name);
      setDraft(note.text ?? "");
      setMode("preview");
      setHistoryOpen(false);
      ensureHistoryLoaded(note);
    },
    [ensureHistoryLoaded]
  );

  const handleCloseModal = React.useCallback(() => {
    if (!selectedNote || isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setSelectedName(null);
      setDraft("");
      setHistoryOpen(false);
      setMode("preview");
      setIsClosing(false);
      closeTimerRef.current = null;
    }, 180);
  }, [isClosing, selectedNote]);

  React.useEffect(() => {
    if (!selectedNote || referenceOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCloseModal, referenceOpen, selectedNote]);

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (referenceCloseTimerRef.current) {
        window.clearTimeout(referenceCloseTimerRef.current);
      }
    };
  }, []);

  const handleReferenceClose = React.useCallback(() => {
    if (referenceCloseTimerRef.current) {
      window.clearTimeout(referenceCloseTimerRef.current);
    }
    setReferenceOpen(false);
    setReferenceClosing(true);
    referenceCloseTimerRef.current = window.setTimeout(() => {
      setReferenceClosing(false);
      referenceCloseTimerRef.current = null;
    }, 180);
  }, []);

  const handleCreateNote = React.useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const created = await fs.createNote(vertex, "");
      setNotes((prev) => [...prev, created]);
      handleOpenNote(created);
      setMode("edit");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notesTab.errors.save"));
    } finally {
      setSaving(false);
    }
  }, [handleOpenNote, t, vertex]);

  React.useEffect(() => {
    if (selectedNote) return;
    const insertShortcut = getShortcut("insert", os);
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (matchesShortcut(event, insertShortcut)) {
        event.preventDefault();
        void handleCreateNote();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCreateNote, os, selectedNote]);

  const handleDeleteNote = async (note: NoteEntry) => {
    setSaving(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      await fs.deleteNote(vertex, note.name);
      setNotes((prev) => prev.filter((n) => n.name !== note.name));
      if (selectedName === note.name) {
        handleCloseModal();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notesTab.errors.save"));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    await handleDeleteNote(target);
  };

  const handleReorder = React.useCallback(
    async (sourceId: string, targetId: string) => {
      const next = moveItem(orderedNotes, sourceId, targetId);
      setNotes(next);
      const nextOrder = buildOrderMap(next);
      setNotesOrderMap(nextOrder);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(orderKey, JSON.stringify(nextOrder));
      }
      try {
        const fs = await getFileSystem();
        const updated: Vertex = {
          ...vertex,
          notes_layout: { mode: "linear", order: nextOrder },
          updated_at: new Date().toISOString(),
        };
        await fs.updateVertex(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("notesTab.errors.save"));
      }
    },
    [orderKey, orderedNotes, t, vertex]
  );

  const handleRevealNote = React.useCallback(
    async (noteName: string) => {
      if (!assetDirectory || !noteName) return;
      const base = assetDirectory.replace(/[\\/]+$/, "");
      const targetPath = `${base}/${noteName}`;
      try {
        const { isTauri, invoke } = await import("@tauri-apps/api/core");
        if (isTauri()) {
          await invoke("fs_open_path", { path: targetPath });
          return;
        }
      } catch {
        // fall back to browser navigation
      }
      window.open(encodeURI(`file://${targetPath}`), "_blank", "noreferrer");
    },
    [assetDirectory]
  );

  const handleCompareNote = React.useCallback(
    (noteName: string) => {
      if (!vertex.id || !noteName) return;
      try {
        window.sessionStorage.setItem(
          "splitScreen.compareNote",
          JSON.stringify({ vertexId: vertex.id, noteName })
        );
      } catch {
        // ignore storage failures
      }
      window.dispatchEvent(new Event("split-screen-open"));
      window.dispatchEvent(
        new CustomEvent("split-screen-compare-note", {
          detail: { vertexId: vertex.id, noteName },
        })
      );
    },
    [vertex.id]
  );

  const handlePersistDraft = React.useCallback(async () => {
    if (!selectedNote) return;
    const original = selectedNote.text ?? "";
    if (draft === original) return;
    setSaving(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const updated = await fs.updateNote(vertex, selectedNote.name, draft);
      if (updated) {
        setNotes((prev) =>
          prev.map((note) => (note.name === updated.name ? updated : note))
        );
        const nextHistory = [
          ...(historyMap[selectedNote.name] ?? []),
          { text: original, at: new Date().toISOString() },
        ].slice(-15);
        setHistoryMap((prev) => ({ ...prev, [selectedNote.name]: nextHistory }));
        saveHistory(vertex.id, selectedNote.name, nextHistory);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notesTab.errors.save"));
    } finally {
      setSaving(false);
    }
  }, [draft, historyMap, selectedNote, t, vertex]);

  const handleModeChange = React.useCallback(
    async (_: unknown, val: Mode | null) => {
      if (!val) return;
      if (val === "preview" && mode === "edit") {
        await handlePersistDraft();
      }
      setMode(val);
    },
    [handlePersistDraft, mode]
  );

  const handleOpenEditMode = React.useCallback(() => {
    if (mode === "edit") return;
    setMode("edit");
    window.requestAnimationFrame(() => {
      editorRef.current?.focus();
    });
  }, [mode]);

  const handleExitEditOnOutsideClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (mode !== "edit" || referenceOpen) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (editorRef.current?.contains(target)) return;
      if (target.closest("[data-notes-controls]")) return;
      void handleModeChange(null, "preview");
    },
    [handleModeChange, mode, referenceOpen]
  );

  const handleSelectHistory = (text: string) => {
    setDraft(text);
    setMode("preview");
  };

  const handleDeleteHistoryEntry = (noteName: string, idx: number) => {
    setHistoryMap((prev) => {
      const nextHistory = [...(prev[noteName] ?? [])];
      nextHistory.splice(idx, 1);
      saveHistory(vertex.id, noteName, nextHistory);
      return { ...prev, [noteName]: nextHistory };
    });
  };

  const handleClearHistory = (noteName: string) => {
    setHistoryMap((prev) => {
      saveHistory(vertex.id, noteName, []);
      return { ...prev, [noteName]: [] };
    });
  };

  React.useEffect(() => {
    if (!selectedNote) {
      setBrokenLinks({});
      return;
    }
    let active = true;
    const validateLinks = async () => {
      const matches = Array.from(
        draft.matchAll(/\[[^\]]+]\(([^)]+)\)/g)
      ).map((match) => match[1]);
      const uniqueLinks = Array.from(new Set(matches)).filter((link) =>
        link.startsWith("mindcapsule://")
      );
      if (uniqueLinks.length === 0) {
        if (active) setBrokenLinks({});
        return;
      }

      const fs = await getFileSystem();
      const results: BrokenLinkMap = {};
      const { isTauri } = await import("@tauri-apps/api/core");

      const checkFileExists = async (targetVertex: Vertex, name: string) => {
        if (!(await isTauri())) return true;
        const { readDir } = await import("@tauri-apps/plugin-fs");
        const entries = await readDir(targetVertex.asset_directory);
        return entries.some((entry) => entry.name === name);
      };

      for (const link of uniqueLinks) {
        let broken = false;
        try {
          if (link.startsWith("mindcapsule://vertex/")) {
            const id = link.replace("mindcapsule://vertex/", "").trim();
            const target = id ? await fs.getVertex(id) : null;
            broken = !target;
          } else if (link.startsWith("mindcapsule://note/")) {
            const parts = link.replace("mindcapsule://note/", "").split("/");
            const vertexId = parts[0];
            const name = decodeURIComponent(parts.slice(1).join("/"));
            const targetVertex = vertexId ? await fs.getVertex(vertexId) : null;
            if (!targetVertex || !name) {
              broken = true;
            } else {
              const note = await fs.getNote(targetVertex, name);
              broken = !note;
            }
          } else if (link.startsWith("mindcapsule://image/")) {
            const parts = link.replace("mindcapsule://image/", "").split("/");
            const vertexId = parts[0];
            const name = decodeURIComponent(parts.slice(1).join("/"));
            const targetVertex = vertexId ? await fs.getVertex(vertexId) : null;
            if (!targetVertex || !name) {
              broken = true;
            } else {
              const image = await fs.getImage(targetVertex, name);
              broken = !image;
            }
          } else if (link.startsWith("mindcapsule://file/")) {
            const parts = link.replace("mindcapsule://file/", "").split("/");
            const vertexId = parts[0];
            const name = decodeURIComponent(parts.slice(1).join("/"));
            const targetVertex = vertexId ? await fs.getVertex(vertexId) : null;
            if (!targetVertex || !name) {
              broken = true;
            } else {
              const exists = await checkFileExists(targetVertex, name);
              broken = !exists;
            }
          }
        } catch {
          broken = true;
        }
        if (broken) results[link] = true;
      }

      if (active) setBrokenLinks(results);
    };
    void validateLinks();
    return () => {
      active = false;
    };
  }, [draft, selectedNote, vertex.id]);

  const insertMarkdownLink = React.useCallback((label: string, url: string) => {
    setDraft((prev) => {
      const safeLabel = label.trim() || t("notesTab.linkFallback");
      const link = `[${safeLabel}](${url})`;
      const input = editorRef.current;
      const start = input?.selectionStart ?? prev.length;
      const end = input?.selectionEnd ?? prev.length;
      const next = prev.slice(0, start) + link + prev.slice(end);
      requestAnimationFrame(() => {
        if (editorRef.current) {
          const pos = start + link.length;
          editorRef.current.setSelectionRange(pos, pos);
          editorRef.current.focus({ preventScroll: true });
        }
      });
      return next;
    });
  }, [t]);

  const handleSelectVertex = React.useCallback(
    (node: GraphNode) => {
      insertMarkdownLink(node.label, `mindcapsule://vertex/${node.id}`);
      setReferenceOpen(false);
    },
    [insertMarkdownLink]
  );

  const handleSelectNote = React.useCallback(
    (note: NoteEntry, noteVertex: Vertex) => {
      const label = note.name.replace(/\.md$/i, "");
      insertMarkdownLink(
        label,
        `mindcapsule://note/${noteVertex.id}/${encodeURIComponent(note.name)}`
      );
      setReferenceOpen(false);
    },
    [insertMarkdownLink]
  );

  const handleSelectImage = React.useCallback(
    (image: ImageEntry, imageVertex: Vertex) => {
      const label = image.alt || image.name;
      insertMarkdownLink(
        label,
        `mindcapsule://image/${imageVertex.id}/${encodeURIComponent(image.name)}`
      );
      setReferenceOpen(false);
    },
    [insertMarkdownLink]
  );

  const handleSelectFile = React.useCallback(
    (file: { name: string }, fileVertex: Vertex) => {
      insertMarkdownLink(
        file.name,
        `mindcapsule://file/${fileVertex.id}/${encodeURIComponent(file.name)}`
      );
      setReferenceOpen(false);
    },
    [insertMarkdownLink]
  );

  const handleOpenFile = React.useCallback(async (path: string) => {
    try {
      const { isTauri, invoke } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        await invoke("fs_open_path", { path });
        return;
      }
      window.open(encodeURI(`file://${path}`), "_blank", "noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("filesTab.errors.open"));
    }
  }, [t]);

  const handlePreviewLink = React.useCallback(
    async (href: string) => {
      if (brokenLinks[href]) return;
      if (href.startsWith("mindcapsule://vertex/")) {
        const id = href.replace("mindcapsule://vertex/", "").trim();
        if (id) onOpenVertex?.(id);
        return;
      }

      const fs = await getFileSystem();
      if (href.startsWith("mindcapsule://note/")) {
        const parts = href.replace("mindcapsule://note/", "").split("/");
        const vertexId = parts[0];
        const name = decodeURIComponent(parts.slice(1).join("/"));
        const targetVertex = vertexId ? await fs.getVertex(vertexId) : null;
        if (!targetVertex || !name) return;
        const note = await fs.getNote(targetVertex, name);
        if (!note) return;
        setNotePreview({ title: note.name.replace(/\.md$/i, ""), text: note.text });
        return;
      }

      if (href.startsWith("mindcapsule://image/")) {
        const parts = href.replace("mindcapsule://image/", "").split("/");
        const vertexId = parts[0];
        const name = decodeURIComponent(parts.slice(1).join("/"));
        const targetVertex = vertexId ? await fs.getVertex(vertexId) : null;
        if (!targetVertex || !name) return;
        const image = await fs.getImage(targetVertex, name);
        if (!image) return;
        setImagePreview({ title: image.alt || image.name, path: image.path });
        return;
      }

      if (href.startsWith("mindcapsule://file/")) {
        const parts = href.replace("mindcapsule://file/", "").split("/");
        const vertexId = parts[0];
        const name = decodeURIComponent(parts.slice(1).join("/"));
        const targetVertex = vertexId ? await fs.getVertex(vertexId) : null;
        if (!targetVertex || !name) return;
        const { isTauri } = await import("@tauri-apps/api/core");
        if (isTauri()) {
          const { join } = await import("@tauri-apps/api/path");
          const path = await join(targetVertex.asset_directory, name);
          await handleOpenFile(path);
          return;
        }
        await handleOpenFile(`${targetVertex.asset_directory}/${name}`);
      }
    },
    [brokenLinks, handleOpenFile, onOpenVertex]
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        position: "relative",
        flex: 1,
        minHeight: "100%",
        alignSelf: "stretch",
      }}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {t("notesTab.title")}
        </Typography>
        <Typography color="text.secondary">
          {t("notesTab.subtitle")}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            {t("notesTab.loading")}
          </Typography>
        ) : orderedNotes.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            {t("notesTab.empty")}
          </Typography>
        ) : (
          <ReorderableGrid
            items={orderedNotes}
            getId={(item) => item.name}
            itemWidth={260}
            itemHeight={195}
            gap={24}
            scrollY={false}
            onReorder={handleReorder}
            dragLabel={t("commonActions.reorder")}
            renderItem={(note, state) => {
              const noteIndex = orderedNotes.findIndex(
                (entry) => entry.name === note.name
              );
              return (
                <Box
                  sx={{
                    position: "relative",
                    borderRadius: 0,
                    overflow: "hidden",
                    boxShadow: 2,
                    cursor: "pointer",
                    height: "100%",
                    backgroundColor: "background.paper",
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    transition: "transform 150ms ease, box-shadow 150ms ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 4,
                    },
                    "&:hover [data-role='note-actions']": {
                      opacity: 1,
                    },
                    "&:hover [data-role='note-drag']": {
                      opacity: 1,
                    },
                  }}
                  onClick={() => handleOpenNote(note)}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {noteIndex >= 0
                      ? t("notesTab.noteLabel", { number: noteIndex + 1 })
                      : note.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: "pre-line",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 6,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {note.text || t("notesTab.emptyNote")}
                  </Typography>
                  <Box
                    data-role="note-actions"
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      display: "flex",
                      gap: 0.5,
                      bgcolor: "rgba(0,0,0,0.45)",
                      borderRadius: 999,
                      p: "2px",
                      opacity: 0,
                      transition: "opacity 150ms ease",
                    }}
                  >
                    <IconButton
                      size="small"
                      sx={{ color: "common.white" }}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenNote(note);
                      }}
                    >
                      <ZoomInIcon fontSize="small" />
                    </IconButton>
                    {!isMobile && (
                      <IconButton
                        size="small"
                        sx={{ color: "common.white" }}
                        aria-label={t("notesTab.compare")}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCompareNote(note.name);
                        }}
                      >
                        <CompareArrowsOutlinedIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      sx={{ color: "common.white" }}
                      aria-label={t("notesTab.openFolder")}
                      disabled={!assetDirectory}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleRevealNote(note.name);
                      }}
                    >
                      <FolderOpenOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ color: "error.light" }}
                      aria-label={t("notesTab.delete")}
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmDelete(note);
                      }}
                      disabled={saving}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box
                    data-role="note-drag"
                    sx={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      opacity: 0,
                      transition: "opacity 150ms ease",
                    }}
                  >
                    <IconButton
                      size="small"
                      draggable={false}
                      aria-label={t("commonActions.reorder")}
                      onPointerDown={state.dragHandleProps?.onPointerDown}
                      sx={{
                        cursor: "grab",
                        bgcolor: "rgba(0,0,0,0.45)",
                        color: "common.white",
                        boxShadow: 2,
                        "&:hover": {
                          bgcolor: "rgba(0,0,0,0.6)",
                        },
                      }}
                    >
                      <DragIndicatorRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              );
            }}
          />
        )}
      </Box>

      {!selectedNote && !isClosing && !referenceOpen && (
        <CreateFab
          title={t("notesTab.create")}
          onClick={() => {
            void handleCreateNote();
          }}
          sx={{ position: "fixed", right: 20, bottom: 94, zIndex: 1300 }}
        />
      )}

      {selectedNote && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "background.default",
            zIndex: 5,
            p: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            animation: `${isClosing ? "notesSlideOut" : "notesSlideIn"} 180ms ease`,
            "@keyframes notesSlideIn": {
              from: { opacity: 0, transform: "translateX(-20px)" },
              to: { opacity: 1, transform: "translateX(0)" },
            },
            "@keyframes notesSlideOut": {
              from: { opacity: 1, transform: "translateX(0)" },
              to: { opacity: 0, transform: "translateX(-20px)" },
            },
          }}
          onMouseDownCapture={handleExitEditOnOutsideClick}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            spacing={2}
            sx={{ width: "100%" }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              data-notes-controls
            >
              <Tooltip title={t("notesTab.close")}>
                <IconButton
                  onClick={handleCloseModal}
                  aria-label={t("notesTab.close")}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("notesTab.insertLink")}>
                <span>
                  <IconButton
                    onClick={() => {
                      setReferenceClosing(false);
                      setReferenceOpen(true);
                    }}
                    aria-label={t("notesTab.insertLink")}
                    disabled={mode !== "edit"}
                  >
                    <LinkOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <ToggleButtonGroup
                size="small"
                value={mode}
                exclusive
                onChange={handleModeChange}
                sx={{
                  borderRadius: 1,
                  bgcolor: "background.paper",
                }}
              >
                <ToggleButton value="preview" sx={{ px: 2.4 }}>
                  <VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} />
                  {t("notesTab.preview")}
                </ToggleButton>
                <ToggleButton value="edit" sx={{ px: 2.4 }}>
                  <EditIcon fontSize="small" sx={{ mr: 0.5 }} />
                  {t("notesTab.edit")}
                </ToggleButton>
              </ToggleButtonGroup>
              <Tooltip title={t("notesTab.history")}> 
                <IconButton
                  onClick={() => setHistoryOpen((prev) => !prev)}
                  aria-label={t("notesTab.history")}
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <Typography variant="h6" sx={{ fontWeight: 900, ml: "auto" }}>
              {selectedNoteLabel || t("notesTab.noteTitle")}
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "flex",
              flex: 1,
              minHeight: 0,
              gap: historyOpen ? 2 : 0,
            }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: "flex",
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                }}
              >
                <Box
                  sx={(theme) => ({
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    borderRadius: '15px',
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: "background.paper",
                    overflow: "hidden",
                  })}
                >
                  {mode === "preview" ? (
                    <Box
                      sx={{
                        color: "text.primary",
                        flex: 1,
                        overflow: "auto",
                        bgcolor: "transparent",
                        p: 2,
                        "& h1,h2,h3,h4,h5,h6": { margin: "0.5em 0 0.25em" },
                        "& p": { margin: "0.25em 0" },
                        "& .broken-link-indicator": {
                          color: "error.main",
                          fontWeight: 600,
                          fontSize: "0.85em",
                        },
                      }}
                      onDoubleClick={(event) => {
                        event.preventDefault();
                        handleOpenEditMode();
                      }}
                      onClick={(event) => {
                        const target = event.target as HTMLElement | null;
                        const anchor = target?.closest("a");
                        if (!anchor) return;
                        const href = anchor.getAttribute("href") ?? "";
                        if (!href.startsWith("mindcapsule://")) return;
                        event.preventDefault();
                        void handlePreviewLink(href);
                      }}
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(draft || "", brokenLinks),
                      }}
                    />
                  ) : (
                    <Box
                      component="textarea"
                      ref={editorRef}
                      value={draft}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setDraft(e.target.value)
                      }
                      onBlur={handlePersistDraft}
                      placeholder={t("notesTab.placeholder")}
                      sx={{
                        width: "100%",
                        minHeight: 0,
                        flex: 1,
                        resize: "none",
                        border: "none",
                        outline: "none",
                        backgroundColor: "transparent",
                        color: "text.primary",
                        fontFamily: "inherit",
                        fontSize: "1rem",
                        lineHeight: 1.6,
                        p: 2,
                        overflow: "auto",
                        display: "block",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>

            <NoteHistoryPanel
              open={historyOpen}
              noteText={selectedNote?.text ?? ""}
              history={noteHistory}
              onSelect={handleSelectHistory}
              onClear={() => {
                if (selectedNote) handleClearHistory(selectedNote.name);
              }}
              onDeleteEntry={(index) => {
                if (selectedNote) handleDeleteHistoryEntry(selectedNote.name, index);
              }}
            />
          </Box>
        </Box>
      )}

      <GraphReferenceOverlay
        open={referenceOpen}
        closing={referenceClosing}
        items={graphItems}
        onClose={handleReferenceClose}
        onSelectVertex={handleSelectVertex}
        onSelectNote={handleSelectNote}
        onSelectImage={handleSelectImage}
        onSelectFile={handleSelectFile}
      />

      <ImagePreviewDialog
        open={Boolean(imagePreview)}
        title={imagePreview?.title ?? ""}
        path={imagePreview?.path ?? ""}
        onClose={() => setImagePreview(null)}
      />

      <NotePreviewDialog
        open={Boolean(notePreview)}
        title={notePreview?.title ?? ""}
        text={notePreview?.text ?? ""}
        onClose={() => setNotePreview(null)}
      />

      <DeleteConfirmDialog
        open={Boolean(confirmDelete)}
        title={t("notesTab.deleteTitle")}
        message={t("notesTab.deletePrompt", {
          name: confirmDelete?.name ?? t("notesTab.noteTitle"),
        })}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </Box>
  );
};
