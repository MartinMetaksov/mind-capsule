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
import type { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { detectOperatingSystem } from "@/utils/os";
import { getShortcut, matchesShortcut } from "@/utils/shortcuts";
import { useTranslation } from "react-i18next";
import Fuse from "fuse.js";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const SearchDialog: React.FC<Props> = ({ open, onClose }) => {
  const [search, setSearch] = React.useState("");
  const [allVertices, setAllVertices] = React.useState<Vertex[]>([]);
  const [allWorkspaces, setAllWorkspaces] = React.useState<Workspace[]>([]);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("common");
  const os = React.useMemo(() => detectOperatingSystem(), []);
  const prevShortcut = React.useMemo(
    () => getShortcut("searchPrevResult", os),
    [os]
  );
  const nextShortcut = React.useMemo(
    () => getShortcut("searchNextResult", os),
    [os]
  );

  React.useEffect(() => {
    if (!open) return;
    setSearch("");
    (async () => {
      const fs = await getFileSystem();
      const [verts, workspaces] = await Promise.all([
        fs.getAllVertices(),
        fs.getWorkspaces(),
      ]);
      setAllVertices(verts);
      setAllWorkspaces(workspaces);
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

  const workspaceMap = React.useMemo(() => {
    const map = new Map<string, Workspace>();
    allWorkspaces.forEach((w) => map.set(w.id, w));
    return map;
  }, [allWorkspaces]);

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

  const resolveWorkspace = React.useCallback(
    (v: Vertex): Workspace | null => {
      let cur: Vertex | undefined = v;
      if (cur.workspace_id) {
        return workspaceMap.get(cur.workspace_id) ?? null;
      }
      while (cur?.parent_id) {
        const parent = vertexMap.get(cur.parent_id);
        if (!parent) break;
        if (parent.workspace_id) {
          return workspaceMap.get(parent.workspace_id) ?? null;
        }
        cur = parent;
      }
      return null;
    },
    [vertexMap, workspaceMap]
  );

  const buildTitlePath = React.useCallback(
    (v: Vertex): string => {
      const segs: string[] = [];
      let cur: Vertex | undefined = v;
      while (cur) {
        segs.unshift(cur.title || cur.id);
        if (!cur.parent_id) break;
        cur = vertexMap.get(cur.parent_id);
        if (!cur) break;
      }
      const workspace = resolveWorkspace(v);
      if (workspace?.name) {
        return `${workspace.name} / ${segs.join(" / ")}`;
      }
      return segs.join(" / ");
    },
    [resolveWorkspace, vertexMap]
  );

  const scopedVertices = React.useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const activeId = segments[segments.length - 1];
    if (!activeId || !vertexMap.has(activeId)) {
      return allVertices;
    }

    const itemsByParent = new Map<string | null, Vertex[]>();
    for (const v of allVertices) {
      const parentId = v.parent_id ?? null;
      const existing = itemsByParent.get(parentId) ?? [];
      existing.push(v);
      itemsByParent.set(parentId, existing);
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
        const items = itemsByParent.get(nextId) ?? [];
        items.forEach((item) => queue.push(item.id));
      }
    }

    return scoped;
  }, [allVertices, location.pathname, vertexMap]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    const segments = location.pathname.split("/").filter(Boolean);
    const activeId = segments[segments.length - 1];
    const fuse = new Fuse(scopedVertices, {
      keys: ["title", "tags"],
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    return fuse
      .search(q)
      .map((result) => result.item)
      .filter((v) => !(activeId && v.id === activeId));
  }, [location.pathname, scopedVertices, search]);

  React.useEffect(() => {
    if (!search || filtered.length === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(0);
  }, [filtered.length, search]);

  const moveActiveIndex = React.useCallback(
    (direction: "prev" | "next") => {
      if (filtered.length === 0) return;
      setActiveIndex((prev) => {
        if (prev === -1) return 0;
        const delta = direction === "next" ? 1 : -1;
        return (prev + delta + filtered.length) % filtered.length;
      });
    },
    [filtered.length]
  );

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (matchesShortcut(e.nativeEvent, prevShortcut)) {
      e.preventDefault();
      moveActiveIndex("prev");
      return;
    }
    if (matchesShortcut(e.nativeEvent, nextShortcut)) {
      e.preventDefault();
      moveActiveIndex("next");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[activeIndex];
      if (!target) return;
      const path = buildPath(target);
      navigate(path);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ px: 3, pt: 3, pb: 1 }}>
        {t("search.title")}
      </DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 0, p: 0 }}
      >
        <Box sx={{ px: 3, pb: 2 }}>
          <TextField
            autoFocus
            inputRef={inputRef}
            placeholder={t("search.placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            fullWidth
            autoComplete="off"
            inputProps={{
              autoComplete: "off",
              autoCapitalize: "none",
              autoCorrect: "off",
              spellCheck: "false",
            }}
          />
        </Box>
        {search ? (
          <List dense disablePadding sx={{ pb: 2 }}>
            {filtered.map((v, idx) => (
              <ListItemButton
                key={v.id}
                selected={idx === activeIndex}
                onClick={() => {
                  const path = buildPath(v);
                  navigate(path);
                  onClose();
                }}
                onMouseEnter={() => setActiveIndex(idx)}
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
                <ListItemText
                  primary={v.title}
                  secondary={buildTitlePath(v)}
                  primaryTypographyProps={{ variant: "body1" }}
                  secondaryTypographyProps={{
                    variant: "body2",
                    color: "text.secondary",
                    sx: { mt: 0.25 },
                  }}
                />
              </ListItemButton>
            ))}
            {filtered.length === 0 && (
              <Typography color="text.secondary" sx={{ px: 3, py: 2 }}>
                {t("search.noResults")}
              </Typography>
            )}
          </List>
        ) : (
          <Typography color="text.secondary" sx={{ px: 3, pb: 3 }}>
            {t("search.emptyState")}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};
