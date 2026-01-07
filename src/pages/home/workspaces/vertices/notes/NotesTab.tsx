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

import type { Vertex } from "@/core/vertex";
import type { Reference } from "@/core/common/reference";
import { getFileSystem } from "@/integrations/fileSystem/integration";

type NoteRef = Extract<Reference, { type: "note" }>;

type NotesTabProps = {
  vertex: Vertex;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
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

export const NotesTab: React.FC<NotesTabProps> = ({
  vertex,
  onVertexUpdated,
}) => {
  const [notes, setNotes] = React.useState<NoteRef[]>(
    (vertex.references ?? []).filter((r): r is NoteRef => r.type === "note")
  );
  const [selectedIdx, setSelectedIdx] = React.useState(
    Math.max(
      (vertex.references ?? []).filter((r) => r.type === "note").length - 1,
      0
    )
  );
  const [mode, setMode] = React.useState<Mode>("preview");
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const noteRefs = (vertex.references ?? []).filter(
      (r): r is NoteRef => r.type === "note"
    );
    setNotes(noteRefs);
    const nextIdx = noteRefs.length > 0 ? noteRefs.length - 1 : 0;
    setSelectedIdx(nextIdx);
    setDraft(noteRefs[nextIdx]?.text ?? "");
    setMode("preview");
    setError(null);
  }, [vertex]);

  const saveNotes = React.useCallback(
    async (nextNotes: NoteRef[]) => {
      setSaving(true);
      setError(null);
      try {
        const others = (vertex.references ?? []).filter((r) => r.type !== "note");
        const updated: Vertex = {
          ...vertex,
          references: [...others, ...nextNotes],
          updated_at: new Date().toISOString(),
        };
        const fs = await getFileSystem();
        await fs.updateVertex(updated);
        setNotes(nextNotes);
        await onVertexUpdated?.(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save note.");
      } finally {
        setSaving(false);
      }
    },
    [onVertexUpdated, vertex]
  );

  const handleCreateVersion = async () => {
    const now = new Date().toISOString();
    const newNote: NoteRef = { type: "note", text: "", created_at: now };
    const nextNotes: NoteRef[] = [...notes, newNote];
    await saveNotes(nextNotes);
    const idx = nextNotes.length - 1;
    setSelectedIdx(idx);
    setDraft("");
    setMode("edit");
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
    const next = notes.map((n, i) =>
      i === selectedIdx ? { ...n, text: draft } : n
    );
    await saveNotes(next);
    setMode("preview");
  }, [draft, notes, saveNotes, selectedIdx]);

  const handleDelete = async (idx: number) => {
    const next = notes.filter((_, i) => i !== idx);
    await saveNotes(next);
    const nextIdx = next.length === 0 ? 0 : Math.min(idx, next.length - 1);
    setSelectedIdx(nextIdx);
    setDraft(next[nextIdx]?.text ?? "");
    setMode("preview");
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
        const created = n.created_at
          ? new Date(n.created_at).toLocaleString()
          : `Revision ${idx + 1}`;
        return (
          <ListItem key={`${n.created_at ?? idx}`} disablePadding>
            <ListItemButton
              selected={idx === selectedIdx}
              onClick={() => handleSelectVersion(idx)}
              sx={{ borderRadius: 1, pr: 1 }}
            >
              <ListItemText
                primary={`Revision ${idx + 1}`}
                secondary={created}
                primaryTypographyProps={{ noWrap: true }}
                secondaryTypographyProps={{ noWrap: true }}
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
          Notes
        </Typography>
        <Typography color="text.secondary">
          Write notes for this vertex and keep each revision accessible.
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
              Revisions
            </Typography>
            <IconButton
              size="small"
              onClick={handleCreateVersion}
              disabled={saving}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
          {notes.length === 0 ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 120,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Typography color="text.secondary">No revisions yet.</Typography>
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
                <VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} /> Preview
              </ToggleButton>
              <ToggleButton
                value="edit"
                sx={{ px: 2.6 }}
                disabled={!currentNote}
              >
                <EditIcon fontSize="small" sx={{ mr: 0.5 }} /> Edit
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
                  No notes yet. Create the first revision to start writing.
                </Typography>
              )
            ) : (
              <TextField
                multiline
                fullWidth
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={handleAutoSave}
                placeholder="Write in Markdown…"
                InputLabelProps={{ shrink: true }}
                minRows={12}
                sx={{ flex: 1 }}
                InputProps={{
                  sx: {
                    alignItems: "flex-start",
                  },
                }}
              />
            )}
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
};
