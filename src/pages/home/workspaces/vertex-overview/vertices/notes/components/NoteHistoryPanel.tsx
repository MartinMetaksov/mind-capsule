import * as React from "react";
import {
  Box,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTranslation } from "react-i18next";
import type { NoteHistoryItem } from "../utils/history";

type NoteHistoryPanelProps = {
  open: boolean;
  noteText: string;
  history: NoteHistoryItem[];
  onSelect: (text: string) => void;
  onClear: () => void;
  onDeleteEntry: (index: number) => void;
};

export const NoteHistoryPanel: React.FC<NoteHistoryPanelProps> = ({
  open,
  noteText,
  history,
  onSelect,
  onClear,
  onDeleteEntry,
}) => {
  const { t } = useTranslation("common");

  return (
    <Collapse
      in={open}
      orientation="horizontal"
      timeout={180}
      sx={{
        display: "flex",
        flexShrink: 0,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: { xs: "100%", md: 280 },
          height: "100%",
          opacity: open ? 1 : 0,
          transform: open ? "translateX(0)" : "translateX(16px)",
          transition: "transform 180ms ease, opacity 180ms ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            width: "100%",
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
                onClick={onClear}
                aria-label={t("notesTab.historyClear")}
                disabled={history.length === 0}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Stack spacing={1}>
            <Paper
              variant="outlined"
              sx={{ p: 1.5, cursor: "pointer" }}
              onClick={() => onSelect(noteText)}
            >
              <Typography variant="caption" color="text.secondary">
                {t("notesTab.currentVersion")}
              </Typography>
              <Typography variant="body2" noWrap>
                {noteText || t("notesTab.emptyNote")}
              </Typography>
            </Paper>
            {history.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                {t("notesTab.historyEmpty")}
              </Typography>
            ) : (
              history
                .map((entry, idx) => ({ entry, idx }))
                .reverse()
                .map(({ entry, idx }) => (
                  <Paper
                    key={`${entry.at}-${idx}`}
                    variant="outlined"
                    sx={{ p: 1.5, cursor: "pointer" }}
                    onClick={() => onSelect(entry.text)}
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
                            onDeleteEntry(idx);
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
      </Box>
    </Collapse>
  );
};
