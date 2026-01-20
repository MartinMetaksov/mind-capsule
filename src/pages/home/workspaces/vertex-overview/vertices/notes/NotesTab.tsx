import * as React from "react";
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useTranslation } from "react-i18next";

import type { Vertex } from "@/core/vertex";
import type { NoteEntry } from "@/integrations/fileSystem/fileSystem";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { DeleteConfirmDialog } from "../../../components/delete-confirm-dialog/DeleteConfirmDialog";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { CreateFab } from "../../../components/create-fab/CreateFab";

type NotesTabProps = {
  vertex: Vertex;
  refreshToken?: number;
};

type Mode = "preview" | "edit";

type NoteHistoryItem = {
  text: string;
  at: string;
};

const renderMarkdown = (text: string): string => {
  let html = text;
  html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
  );
  html = html.replace(/^- (.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
  html = html.replace(/\n/g, "<br/>");
  return html;
};

const historyKeyFor = (vertexId: string, name: string) =>
  `notesHistory:${vertexId}:${name}`;

const loadHistory = (vertexId: string, name: string): NoteHistoryItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(historyKeyFor(vertexId, name));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NoteHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveHistory = (vertexId: string, name: string, history: NoteHistoryItem[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(historyKeyFor(vertexId, name), JSON.stringify(history));
};

export const NotesTab: React.FC<NotesTabProps> = ({ vertex, refreshToken }) => {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const [notes, setNotes] = React.useState<NoteEntry[]>([]);
  const [selectedName, setSelectedName] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<Mode>("preview");
  const [draft, setDraft] = React.useState("");
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyMap, setHistoryMap] = React.useState<Record<string, NoteHistoryItem[]>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<NoteEntry | null>(null);
  const hasLoadedRef = React.useRef(false);
  const os = React.useMemo(() => detectOperatingSystem(), []);

  const selectedNote = selectedName
    ? notes.find((note) => note.name === selectedName) ?? null
    : null;

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
      setSelectedName(note.name);
      setDraft(note.text ?? "");
      setMode("preview");
      setHistoryOpen(false);
      ensureHistoryLoaded(note);
    },
    [ensureHistoryLoaded]
  );

  const handleCloseModal = React.useCallback(() => {
    setSelectedName(null);
    setDraft("");
    setHistoryOpen(false);
    setMode("preview");
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

  const noteCardBg =
    theme.palette.mode === "dark" ? theme.palette.background.paper : "#fdf4b2";
  const noteCardBorder =
    theme.palette.mode === "dark" ? theme.palette.divider : "#f2e2a4";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        position: "relative",
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

      {loading ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography color="text.secondary">{t("notesTab.loading")}</Typography>
        </Box>
      ) : notes.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography color="text.secondary">{t("notesTab.empty")}</Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 2,
          }}
        >
          {notes.map((note, idx) => (
            <Paper
              key={note.name}
              variant="outlined"
              sx={{
                p: 2,
                minHeight: 160,
                bgcolor: noteCardBg,
                borderColor: noteCardBorder,
                position: "relative",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                boxShadow:
                  theme.palette.mode === "dark"
                    ? "0 8px 18px rgba(0,0,0,0.3)"
                    : "0 10px 22px rgba(0,0,0,0.08)",
              }}
              onClick={() => handleOpenNote(note)}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t("notesTab.noteLabel", { number: idx + 1 })}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Tooltip title={t("notesTab.delete")}>
                  <IconButton
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      setConfirmDelete(note);
                    }}
                    disabled={saving}
                    aria-label={t("notesTab.delete")}
                    sx={{
                      bgcolor: theme.palette.mode === "dark" ? "#1d1a0b" : "#f7e691",
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
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
            </Paper>
          ))}
        </Box>
      )}

      <CreateFab
        title={t("notesTab.create")}
        onClick={() => {
          void handleCreateNote();
        }}
        sx={{ position: "fixed", right: 20, bottom: 94, zIndex: 1300 }}
      />

      <Dialog
        fullScreen
        open={Boolean(selectedNote)}
        onClose={handleCloseModal}
      >
        <DialogContent
          sx={{
            p: { xs: 2, md: 3 },
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {t("notesTab.noteTitle")}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <ToggleButtonGroup
                size="small"
                value={mode}
                exclusive
                onChange={handleModeChange}
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
              <Tooltip title={t("notesTab.close")}>
                <IconButton
                  onClick={handleCloseModal}
                  aria-label={t("notesTab.close")}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Box sx={{ display: "flex", flex: 1, minHeight: 0, gap: 2 }}>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                overflow: "auto",
                display: "flex",
              }}
            >
              {mode === "preview" ? (
                <Box
                  sx={{
                    color: "text.primary",
                    flex: 1,
                    "& h1,h2,h3,h4,h5,h6": { margin: "0.5em 0 0.25em" },
                    "& p": { margin: "0.25em 0" },
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(draft || ""),
                  }}
                />
              ) : (
                <TextField
                  multiline
                  fullWidth
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={handlePersistDraft}
                  placeholder={t("notesTab.placeholder")}
                  minRows={12}
                  sx={{ height: "100%", flex: 1 }}
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: { sx: { alignItems: "flex-start", height: "100%" } },
                  }}
                />
              )}
            </Box>

            {historyOpen && (
              <Paper
                variant="outlined"
                sx={{
                  width: { xs: "100%", md: 280 },
                  flexShrink: 0,
                  p: 2,
                  height: "100%",
                  overflow: "auto",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {t("notesTab.history")}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title={t("notesTab.historyClear")}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (selectedNote) handleClearHistory(selectedNote.name);
                      }}
                      aria-label={t("notesTab.historyClear")}
                      disabled={!selectedNote || noteHistory.length === 0}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Stack spacing={1}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 1.5, cursor: "pointer" }}
                    onClick={() => handleSelectHistory(selectedNote?.text ?? "")}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {t("notesTab.currentVersion")}
                    </Typography>
                    <Typography variant="body2" noWrap>
                      {(selectedNote?.text ?? "") || t("notesTab.emptyNote")}
                    </Typography>
                  </Paper>
                  {noteHistory.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">
                      {t("notesTab.historyEmpty")}
                    </Typography>
                  ) : (
                    noteHistory
                      .map((entry, idx) => ({ entry, idx }))
                      .reverse()
                      .map(({ entry, idx }) => (
                        <Paper
                          key={`${entry.at}-${idx}`}
                          variant="outlined"
                          sx={{ p: 1.5, cursor: "pointer" }}
                          onClick={() => handleSelectHistory(entry.text)}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(entry.at).toLocaleString()}
                            </Typography>
                            <Box sx={{ flex: 1 }} />
                            <Tooltip title={t("notesTab.historyDelete")}>
                              <IconButton
                                size="small"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (selectedNote) {
                                    handleDeleteHistoryEntry(selectedNote.name, idx);
                                  }
                                }}
                                aria-label={t("notesTab.historyDelete")}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Typography variant="body2" noWrap>
                            {entry.text || t("notesTab.emptyNote")}
                          </Typography>
                        </Paper>
                      ))
                  )}
                </Stack>
              </Paper>
            )}
          </Box>
        </DialogContent>
      </Dialog>

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
