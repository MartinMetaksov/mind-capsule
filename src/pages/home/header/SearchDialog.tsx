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

type Props = {
  open: boolean;
  onClose: () => void;
};

const TAB_KEYS = ["children", "properties", "tags", "notes", "images", "urls"] as const;

export const SearchDialog: React.FC<Props> = ({ open, onClose }) => {
  const [search, setSearch] = React.useState("");
  const [searchTab, setSearchTab] = React.useState(0);
  const [allVertices, setAllVertices] = React.useState<Vertex[]>([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!open) return;
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
      const refs = v.references ?? [];
      if (match(v.title)) byTab.vertices.push(v);
      if (match(v.kind) || match(v.children_behavior?.child_kind)) {
        byTab.properties.push(v);
      }
      if (v.tags?.some((t) => match(t))) byTab.tags.push(v);
      if (refs.some((r) => r.type === "note" && match(r.text))) {
        byTab.notes.push(v);
      }
      if (
        refs.some(
          (r) =>
            r.type === "image" &&
            (match(r.alt) || match((r as { description?: string }).description) || match(r.path))
        )
      ) {
        byTab.images.push(v);
      }
      if (refs.some((r) => r.type === "url" && (match(r.url) || match((r as { title?: string }).title)))) {
        byTab.links.push(v);
      }
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
      <DialogTitle>Search</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          autoFocus
          placeholder="Search…"
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
          <Tab label={`Vertices (${filtered.vertices.length})`} />
          <Tab label={`Properties (${filtered.properties.length})`} />
          <Tab label={`Tags (${filtered.tags.length})`} />
          <Tab label={`Notes (${filtered.notes.length})`} />
          <Tab label={`Images (${filtered.images.length})`} />
          <Tab label={`Links (${filtered.links.length})`} />
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
                  <ListItemText primary={v.title} secondary={`/${tabName}`} />
                </ListItemButton>
              );
            })}
            {resultSets[searchTab].length === 0 && (
              <Typography color="text.secondary" sx={{ px: 1, py: 2 }}>
                No results.
              </Typography>
            )}
          </List>
        ) : (
          <Typography color="text.secondary">Start typing to see results.</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};
