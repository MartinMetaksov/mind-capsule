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
import type { UrlEntry } from "@/integrations/fileSystem/fileSystem";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";

type LinksTabProps = {
  vertex: Vertex;
  refreshToken?: number;
};

export const LinksTab: React.FC<LinksTabProps> = ({ vertex, refreshToken }) => {
  const { t } = useTranslation("common");
  const [links, setLinks] = React.useState<UrlEntry[]>([]);
  const [url, setUrl] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const urlRef = React.useRef<HTMLInputElement | null>(null);
  const hasLoadedRef = React.useRef(false);

  const focusUrl = React.useCallback(() => {
    requestAnimationFrame(() => {
      urlRef.current?.focus({ preventScroll: true });
    });
  }, []);

  React.useEffect(() => {
    const loadLinks = async () => {
      const isRefresh = hasLoadedRef.current;
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const fs = await getFileSystem();
        const list = await fs.listLinks(vertex);
        setLinks(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("linksTab.errors.update"));
        setLinks([]);
      } finally {
        if (!isRefresh) setLoading(false);
        hasLoadedRef.current = true;
        focusUrl();
      }
    };
    loadLinks();
  }, [focusUrl, refreshToken, t, vertex]);

  const handleAdd = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    setSaving(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const created = await fs.createLink(vertex, {
        url: trimmedUrl,
        title: title.trim() || undefined,
      });
      setLinks((prev) => [...prev, created]);
      setUrl("");
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("linksTab.errors.update"));
    } finally {
      setSaving(false);
      focusUrl();
    }
  };

  const handleRemove = async (idx: number) => {
    const target = links[idx];
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      await fs.deleteLink(vertex, target.id);
      setLinks((prev) => prev.filter((_, i) => i !== idx));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("linksTab.errors.update"));
    } finally {
      setSaving(false);
      focusUrl();
    }
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
            slotProps={{ inputLabel: { shrink: true } }}
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
            slotProps={{ inputLabel: { shrink: true } }}
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

        {loading ? (
          <Typography color="text.secondary">{t("linksTab.loading")}</Typography>
        ) : links.length === 0 ? (
          <Typography color="text.secondary">{t("linksTab.empty")}</Typography>
        ) : (
          <Stack spacing={1}>
            {links.map((link, idx) => (
              <Paper
                key={link.id}
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
                  aria-label={t("commonActions.delete")}
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
