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

import type { Vertex } from "@/core/vertex";
import type { UrlEntry } from "@/integrations/fileSystem/fileSystem";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";
import { DeleteConfirmDialog } from "../../../components/delete-confirm-dialog/DeleteConfirmDialog";

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
  const [deleteTarget, setDeleteTarget] = React.useState<UrlEntry | null>(null);
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

  const handleRemove = async (target: UrlEntry) => {
    setSaving(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      await fs.deleteLink(vertex, target.id);
      setLinks((prev) => prev.filter((link) => link.id !== target.id));
      setDeleteTarget(null);
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

  const normalizeUrl = React.useCallback((rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }, []);

  const handleOpenLink = React.useCallback(async (targetUrl: string) => {
    const normalizedUrl = normalizeUrl(targetUrl);
    if (!normalizedUrl) return;
    try {
      const { isTauri, invoke } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        await invoke("open_external_url", { url: normalizedUrl });
        return;
      }
    } catch {
      // fall back to browser navigation
    }
    window.open(normalizedUrl, "_blank", "noreferrer");
  }, [normalizeUrl]);

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ width: "100%", maxWidth: 760, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          {t("linksTab.title")}
        </Typography>
        <Typography color="text.secondary">
          {t("linksTab.description")}
        </Typography>
      </Box>

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
            sx={{
              "& .MuiInputBase-root": {
                bgcolor: "background.paper",
              },
            }}
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
            sx={{
              "& .MuiInputBase-root": {
                bgcolor: "background.paper",
              },
            }}
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
                onClick={() => void handleOpenLink(link.url)}
                sx={{
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  cursor: "pointer",
                  transition: "background-color 120ms ease, box-shadow 120ms ease",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
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
                  color="error"
                  aria-label={t("commonActions.delete")}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteTarget(link);
                  }}
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

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("linksTab.deleteTitle")}
        message={t("linksTab.deletePrompt", {
          name: deleteTarget?.title || deleteTarget?.url || "",
        })}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void handleRemove(deleteTarget);
        }}
      />
    </Box>
  );
};
