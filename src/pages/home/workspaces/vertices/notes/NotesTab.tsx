import * as React from "react";
import {
  Alert,
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTranslation } from "react-i18next";

import type { Vertex } from "@/core/vertex";
import type { NoteEntry } from "@/integrations/fileSystem/fileSystem";
import { getFileSystem } from "@/integrations/fileSystem/integration";

type NotesTabProps = {
  vertex: Vertex;
  refreshToken?: number;
};

type Mode = "preview" | "edit";

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

export const NotesTab: React.FC<NotesTabProps> = ({ vertex, refreshToken }) => {
  const { t } = useTranslation("common");
  const [notes, setNotes] = React.useState<NoteEntry[]>([]);
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [mode, setMode] = React.useState<Mode>("preview");
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const hasLoadedRef = React.useRef(false);

  React.useEffect(() => {
    const loadNotes = async () => {
      const isRefresh = hasLoadedRef.current;
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const fs = await getFileSystem();
        const list = await fs.listNotes(vertex);
        setNotes(list);
        const nextIdx = list.length > 0 ? list.length - 1 : 0;
        setSelectedIdx(nextIdx);
        setDraft(list[nextIdx]?.text ?? "");
        setMode("preview");
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

  const handleCreateVersion = async () => {
    setSaving(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const created = await fs.createNote(vertex, "");
      setNotes((prev) => [...prev, created]);
      const idx = notes.length;
      setSelectedIdx(idx);
      setDraft("");
      setMode("edit");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notesTab.errors.save"));
    } finally {
      setSaving(false);
    }
  };

  const handleSelectVersion = (idx: number) => {
    setSelectedIdx(idx);
    setDraft(notes[idx]?.text ?? "");
    setMode("preview");
  };

  const handleAutoSave = React.useCallback(async () => {
    const current = notes[selectedIdx];
    const original = current?.text ?? "";
    if (!current || draft === original) {
      setMode("preview");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const updated = await fs.updateNote(vertex, current.name, draft);
      if (updated) {
        setNotes((prev) =>
          prev.map((n, i) => (i === selectedIdx ? updated : n))
        );
      }
      setMode("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notesTab.errors.save"));
    } finally {
      setSaving(false);
    }
  }, [draft, notes, selectedIdx, t, vertex]);

  const handleDelete = async (idx: number) => {
    const target = notes[idx];
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      await fs.deleteNote(vertex, target.name);
      const next = notes.filter((_, i) => i !== idx);
      setNotes(next);
      const nextIdx = next.length === 0 ? 0 : Math.min(idx, next.length - 1);
      setSelectedIdx(nextIdx);
      setDraft(next[nextIdx]?.text ?? "");
      setMode("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notesTab.errors.save"));
    } finally {
      setSaving(false);
    }
  };

  const handleModeChange = React.useCallback(
    async (_: unknown, val: Mode | null) => {
      if (!val) return;
      if (val === "preview" && mode === "edit") {
        await handleAutoSave();
      } else {
        setMode(val);
      }
    },
    [handleAutoSave, mode]
  );

  const currentNote = notes[selectedIdx];

  const revisionsList = (
    <List dense disablePadding sx={{ width: "100%" }}>
      {notes.map((n, idx) => {
        const created = n.name;
        return (
          <ListItem key={n.name} disablePadding>
            <ListItemButton
              selected={idx === selectedIdx}
              onClick={() => handleSelectVersion(idx)}
              sx={{ borderRadius: 1, pr: 1 }}
            >
              <ListItemText
                primary={t("notesTab.revisionLabel", { number: idx + 1 })}
                secondary={created}
                slotProps={{
                  primary: { noWrap: true },
                  secondary: { noWrap: true },
                }}
              />
              <IconButton
                edge="end"
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(idx);
                }}
                disabled={saving}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
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

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ flex: 1, minHeight: 0 }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            width: { xs: "100%", md: 280 },
            minWidth: { xs: "100%", md: 240 },
            flexShrink: 0,
            minHeight: 200,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t("notesTab.revisions")}
            </Typography>
            <IconButton
              size="small"
              onClick={handleCreateVersion}
              disabled={saving}
              aria-label={t("notesTab.create")}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
          {loading ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 120,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Typography color="text.secondary">
                {t("notesTab.loading")}
              </Typography>
            </Box>
          ) : notes.length === 0 ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 120,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Typography color="text.secondary">
                {t("notesTab.empty")}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, overflow: "auto" }}>{revisionsList}</Box>
          )}
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            flex: 1,
            minHeight: 320,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <ToggleButtonGroup
              size="small"
              value={mode}
              exclusive
              onChange={handleModeChange}
            >
              <ToggleButton
                value="preview"
                sx={{ px: 2.6 }}
                disabled={!currentNote}
              >
                <VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} /> {t("notesTab.preview")}
              </ToggleButton>
              <ToggleButton
                value="edit"
                sx={{ px: 2.6 }}
                disabled={!currentNote}
              >
                <EditIcon fontSize="small" sx={{ mr: 0.5 }} /> {t("notesTab.edit")}
              </ToggleButton>
            </ToggleButtonGroup>
            <Box sx={{ minWidth: 80 }} />
          </Stack>

          <Divider />

          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex" }}>
            {mode === "preview" ? (
              currentNote ? (
                <Box
                  sx={{
                    flex: 1,
                    color: "text.primary",
                    "& h1,h2,h3,h4,h5,h6": { margin: "0.5em 0 0.25em" },
                    "& p": { margin: "0.25em 0" },
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(currentNote.text ?? ""),
                  }}
                />
              ) : (
                <Typography color="text.secondary">
                  {t("notesTab.noNotes")}
                </Typography>
              )
            ) : (
              <TextField
                multiline
                fullWidth
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={handleAutoSave}
                placeholder={t("notesTab.placeholder")}
                slotProps={{ inputLabel: { shrink: true }, input: { sx: { alignItems: "flex-start" } } }}
                minRows={12}
                sx={{ flex: 1 }}
              />
            )}
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
};
