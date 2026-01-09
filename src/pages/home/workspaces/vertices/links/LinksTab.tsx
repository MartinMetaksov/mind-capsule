import * as React from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import type { Vertex } from "@/core/vertex";
import type { Reference } from "@/core/common/reference";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";

type LinksTabProps = {
  vertex: Vertex;
  onVertexUpdated?: (vertex: Vertex) => Promise<void> | void;
};

type UrlRef = Extract<Reference, { type: "url" }>;

export const LinksTab: React.FC<LinksTabProps> = ({
  vertex,
  onVertexUpdated,
}) => {
  const { t } = useTranslation("common");
  const [links, setLinks] = React.useState<UrlRef[]>(
    (vertex.references ?? []).filter((r): r is UrlRef => r.type === "url")
  );
  const [url, setUrl] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const urlRef = React.useRef<HTMLInputElement | null>(null);

  const focusUrl = React.useCallback(() => {
    requestAnimationFrame(() => {
      urlRef.current?.focus({ preventScroll: true });
    });
  }, []);

  React.useEffect(() => {
    setLinks(
      (vertex.references ?? []).filter((r): r is UrlRef => r.type === "url")
    );
    setError(null);
    focusUrl();
  }, [vertex, focusUrl]);

  const persistLinks = async (nextLinks: UrlRef[]) => {
    setSaving(true);
    setError(null);
    try {
      const others = (vertex.references ?? []).filter((r) => r.type !== "url");
      const updated: Vertex = {
        ...vertex,
        references: [...others, ...nextLinks],
        updated_at: new Date().toISOString(),
      };
      const fs = await getFileSystem();
      await fs.updateVertex(updated);
      setLinks(nextLinks);
      await onVertexUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("linksTab.errors.update"));
    } finally {
      setSaving(false);
      focusUrl();
    }
  };

  const handleAdd = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    const newRef: UrlRef = { type: "url", url: trimmedUrl, title: title.trim() || undefined };
    await persistLinks([...links, newRef]);
    setUrl("");
    setTitle("");
  };

  const handleRemove = async (idx: number) => {
    const next = links.filter((_, i) => i !== idx);
    await persistLinks(next);
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
          {t("linksTab.title")}
        </Typography>
        <Typography color="text.secondary">
          {t("linksTab.description")}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label={t("linksTab.url")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            inputRef={urlRef}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            placeholder={t("linksTab.urlPlaceholder")}
            disabled={saving}
            type="url"
          />
          <TextField
            label={t("linksTab.titleLabel")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            placeholder={t("linksTab.titlePlaceholder")}
            disabled={saving}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={saving || !url.trim()}
            sx={{
              whiteSpace: "nowrap",
              px: 3,
              minWidth: { xs: "100%", sm: "140px" },
              height: 40,
            }}
          >
            {t("linksTab.add")}
          </Button>
        </Stack>

        {links.length === 0 ? (
          <Typography color="text.secondary">{t("linksTab.empty")}</Typography>
        ) : (
          <Stack spacing={1}>
            {links.map((link, idx) => (
              <Paper
                key={`${link.url}-${idx}`}
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }} noWrap>
                    {link.title || link.url}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    title={link.url}
                  >
                    {link.url}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  component="a"
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemove(idx)}
                  disabled={saving}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
};
