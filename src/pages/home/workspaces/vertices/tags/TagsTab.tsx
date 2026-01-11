import * as React from "react";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";

import type { Vertex } from "@/core/vertex";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";

type TagsTabProps = {
  vertex: Vertex;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
};

export const TagsTab: React.FC<TagsTabProps> = ({ vertex, onVertexUpdated }) => {
  const { t } = useTranslation("common");
  const [tags, setTags] = React.useState<string[]>(vertex.tags ?? []);
  const [input, setInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const focusInput = React.useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  React.useEffect(() => {
    setTags(vertex.tags ?? []);
    setError(null);
    focusInput();
  }, [vertex, focusInput]);

  const persistTags = async (next: string[]) => {
    setSaving(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const updated: Vertex = {
        ...vertex,
        tags: next,
        updated_at: new Date().toISOString(),
      };
      await fs.updateVertex(updated);
      setTags(next);
      await onVertexUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tagsTab.errors.update"));
    } finally {
      setSaving(false);
      focusInput();
    }
  };

  const handleAdd = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setInput("");
      focusInput();
      return;
    }
    await persistTags([...tags, trimmed]);
    setInput("");
    focusInput();
  };

  const handleRemove = async (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    await persistTags(next);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = async (
    e
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleAdd();
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        maxWidth: 760,
        mx: "auto",
        width: "100%",
      }}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {t("tagsTab.title")}
        </Typography>
        <Typography color="text.secondary">
          {t("tagsTab.description")}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
        <TextField
          label={t("tagsTab.newTag")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          fullWidth
          size="small"
          InputLabelProps={{ shrink: true }}
          placeholder={t("tagsTab.placeholder")}
          disabled={saving}
        />
        <IconButton
          color="primary"
          onClick={handleAdd}
          disabled={saving || !input.trim()}
          aria-label={t("tagsTab.add")}
          sx={{ border: 1, borderColor: "divider" }}
        >
          <AddIcon />
        </IconButton>
      </Stack>

      {tags.length === 0 ? (
        <Typography color="text.secondary">{t("tagsTab.empty")}</Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              variant="outlined"
              onDelete={saving ? undefined : () => handleRemove(tag)}
              deleteIcon={
                <ClearIcon
                  fontSize="small"
                  data-testid={`delete-tag-${tag}`}
                  aria-label={`delete-tag-${tag}`}
                />
              }
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
