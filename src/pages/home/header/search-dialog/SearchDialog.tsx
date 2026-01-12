import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { Vertex } from "@/core/vertex";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onClose: () => void;
};

const TAB_KEYS = ["children", "properties", "tags", "notes", "images", "urls"] as const;

export const SearchDialog: React.FC<Props> = ({ open, onClose }) => {
  const [search, setSearch] = React.useState("");
  const [searchTab, setSearchTab] = React.useState(0);
  const [allVertices, setAllVertices] = React.useState<Vertex[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  React.useEffect(() => {
    if (!open) return;
    setSearch("");
    setSearchTab(0);
    (async () => {
      const fs = await getFileSystem();
      // load all vertices present in storage
      const ids: string[] = [];
      Object.keys(localStorage)
        .filter((k) => k.includes("vertices"))
        .forEach((k) => {
          try {
            const val = localStorage.getItem(k);
            if (!val) return;
            const parsed = JSON.parse(val) as Record<string, Vertex>;
            ids.push(...Object.keys(parsed));
          } catch {
            /* ignore */
          }
        });
      const unique = Array.from(new Set(ids));
      const verts: Vertex[] = [];
      for (const id of unique) {
        const v = await fs.getVertex(id);
        if (v) verts.push(v);
      }
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

  const buildPath = (v: Vertex, tab: string) => {
    const segs: string[] = [];
    let cur: Vertex | undefined = v;
    while (cur) {
      segs.unshift(cur.id);
      if (!cur.parent_id) break;
      cur = vertexMap.get(cur.parent_id);
      if (!cur) break;
    }
    const tabSeg = TAB_KEYS.includes(tab as (typeof TAB_KEYS)[number]) ? `?tab=${tab}` : "";
    return `/${segs.join("/")}${tabSeg}`;
  };

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    const match = (text?: string) => text?.toLowerCase().includes(q);

    const byTab = {
      vertices: [] as Vertex[],
      properties: [] as Vertex[],
      tags: [] as Vertex[],
      notes: [] as Vertex[],
      images: [] as Vertex[],
      links: [] as Vertex[],
    };

    if (!q) return byTab;

    for (const v of allVertices) {
      if (match(v.title)) byTab.vertices.push(v);
      if (match(v.children_behavior?.child_kind)) {
        byTab.properties.push(v);
      }
      if (v.tags?.some((t) => match(t))) byTab.tags.push(v);
    }
    return byTab;
  }, [allVertices, search]);

  const resultSets = [
    filtered.vertices,
    filtered.properties,
    filtered.tags,
    filtered.notes,
    filtered.images,
    filtered.links,
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
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
        <Tabs
          value={searchTab}
          onChange={(_, v) => setSearchTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={t("search.tabs.vertices", { count: filtered.vertices.length })} />
          <Tab label={t("search.tabs.properties", { count: filtered.properties.length })} />
          <Tab label={t("search.tabs.tags", { count: filtered.tags.length })} />
          <Tab label={t("search.tabs.notes", { count: filtered.notes.length })} />
          <Tab label={t("search.tabs.images", { count: filtered.images.length })} />
          <Tab label={t("search.tabs.links", { count: filtered.links.length })} />
        </Tabs>
        {search ? (
          <List dense>
            {resultSets[searchTab].map((v) => {
              const tabName = ["children", "properties", "tags", "notes", "images", "urls"][searchTab];
              return (
                <ListItemButton
                  key={`${v.id}-${tabName}`}
                  onClick={() => {
                    const path = buildPath(v, tabName);
                    navigate(path);
                    onClose();
                  }}
                >
                  <ListItemText primary={v.title} secondary={`/${t(`search.tabNames.${tabName}`)}`} />
                </ListItemButton>
              );
            })}
            {resultSets[searchTab].length === 0 && (
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
