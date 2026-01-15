import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import type { Vertex } from "@/core/vertex";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const SearchDialog: React.FC<Props> = ({ open, onClose }) => {
  const [search, setSearch] = React.useState("");
  const [allVertices, setAllVertices] = React.useState<Vertex[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("common");

  React.useEffect(() => {
    if (!open) return;
    setSearch("");
    (async () => {
      const fs = await getFileSystem();
      const verts = await fs.getAllVertices();
      setAllVertices(verts);
      // defer focus to ensure dialog is painted
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    })();
  }, [open]);

  const vertexMap = React.useMemo(() => {
    const map = new Map<string, Vertex>();
    allVertices.forEach((v) => map.set(v.id, v));
    return map;
  }, [allVertices]);

  const buildPath = (v: Vertex) => {
    const segs: string[] = [];
    let cur: Vertex | undefined = v;
    while (cur) {
      segs.unshift(cur.id);
      if (!cur.parent_id) break;
      cur = vertexMap.get(cur.parent_id);
      if (!cur) break;
    }
    return `/${segs.join("/")}`;
  };

  const scopedVertices = React.useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const activeId = segments[segments.length - 1];
    if (!activeId || !vertexMap.has(activeId)) {
      return allVertices;
    }

    const childrenByParent = new Map<string | null, Vertex[]>();
    for (const v of allVertices) {
      const parentId = v.parent_id ?? null;
      const existing = childrenByParent.get(parentId) ?? [];
      existing.push(v);
      childrenByParent.set(parentId, existing);
    }

    const scoped: Vertex[] = [];
    const queue: string[] = [activeId];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const nextId = queue.shift();
      if (!nextId || seen.has(nextId)) continue;
      seen.add(nextId);
      const vertex = vertexMap.get(nextId);
      if (vertex) {
        scoped.push(vertex);
        const children = childrenByParent.get(nextId) ?? [];
        children.forEach((child) => queue.push(child.id));
      }
    }

    return scoped;
  }, [allVertices, location.pathname, vertexMap]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    const segments = location.pathname.split("/").filter(Boolean);
    const activeId = segments[segments.length - 1];
    return scopedVertices.filter((v) => {
      if (activeId && v.id === activeId) return false;
      if (v.title.toLowerCase().includes(q)) return true;
      return v.tags?.some((tag) => tag.toLowerCase().includes(q)) ?? false;
    });
  }, [location.pathname, scopedVertices, search]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("search.title")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          autoFocus
          inputRef={inputRef}
          placeholder={t("search.placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />
        {search ? (
          <List dense>
            {filtered.map((v) => (
              <ListItemButton
                key={v.id}
                onClick={() => {
                  const path = buildPath(v);
                  navigate(path);
                  onClose();
                }}
                sx={{ gap: 2, alignItems: "center" }}
              >
                <Box
                  sx={(theme) => ({
                    width: 52,
                    height: 52,
                    borderRadius: 0.75,
                    overflow: "hidden",
                    flexShrink: 0,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: "background.paper",
                  })}
                >
                  {v.thumbnail_path ? (
                    <Box
                      component="img"
                      src={v.thumbnail_path}
                      alt={v.thumbnail_alt ?? v.title}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <Box
                      sx={(theme) => ({
                        width: "100%",
                        height: "100%",
                        background:
                          theme.palette.mode === "dark"
                            ? "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))"
                            : "linear-gradient(145deg, rgba(0,0,0,0.08), rgba(0,0,0,0.02))",
                      })}
                    />
                  )}
                </Box>
                <ListItemText primary={v.title} />
              </ListItemButton>
            ))}
            {filtered.length === 0 && (
              <Typography color="text.secondary" sx={{ px: 1, py: 2 }}>
                {t("search.noResults")}
              </Typography>
            )}
          </List>
        ) : (
          <Typography color="text.secondary">{t("search.emptyState")}</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};
