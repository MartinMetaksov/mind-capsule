import * as React from "react";
import { Box, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import type { NoteEntry } from "@/integrations/fileSystem/fileSystem";

type NotesListProps = {
  notes: NoteEntry[];
  saving: boolean;
  onOpenNote: (note: NoteEntry) => void;
  onDeleteNote: (note: NoteEntry) => void;
};

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  saving,
  onOpenNote,
  onDeleteNote,
}) => {
  const { t } = useTranslation("common");
  const theme = useTheme();

  return (
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
            bgcolor: "background.paper",
            borderColor: "divider",
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
          onClick={() => onOpenNote(note)}
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
                  onDeleteNote(note);
                }}
                disabled={saving}
                aria-label={t("notesTab.delete")}
                sx={{
                  bgcolor: theme.palette.background.paper,
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
  );
};
