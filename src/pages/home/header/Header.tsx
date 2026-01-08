import * as React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Tooltip,
  Box,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  TextField,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import BrightnessAutoOutlinedIcon from "@mui/icons-material/BrightnessAutoOutlined";
import { ThemePreference } from "@/utils/themes/themePreference";
import { useThemeMode } from "@/utils/themes/hooks/useThemeMode";
import { APP_NAME } from "@/constants/appConstants";
import { useNavigate } from "react-router-dom";
import { SearchOutlined } from "@mui/icons-material";
import type { Vertex } from "@/core/vertex";
import { getFileSystem } from "@/integrations/fileSystem/integration";

export const Header: React.FC = () => {
  const { preference, setPreference } = useThemeMode();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [searchTab, setSearchTab] = React.useState(0);
  const [allVertices, setAllVertices] = React.useState<Vertex[]>([]);
  const navigate = useNavigate();

  const allowedTabs = [
    "children",
    "properties",
    "tags",
    "notes",
    "images",
    "urls",
  ] as const;

  React.useEffect(() => {
    if (!searchOpen) return;
    (async () => {
      const fs = await getFileSystem();
      const results: Vertex[] = [];
      // load all vertices by traversing from roots we already have in storage
      // using getVertex over stored keys via a crude scan of local storage keys
      const maybeIds = Object.keys(localStorage)
        .filter((k) => k.includes("vertices"))
        .flatMap((k) => {
          try {
            const val = localStorage.getItem(k);
            if (!val) return [];
            const parsed = JSON.parse(val) as Record<string, Vertex>;
            return Object.keys(parsed);
          } catch {
            return [];
          }
        });
      const uniqueIds = Array.from(new Set(maybeIds));
      for (const id of uniqueIds) {
        const v = await fs.getVertex(id);
        if (v) results.push(v);
      }
      setAllVertices(results);
    })();
  }, [searchOpen]);

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
    const tabSeg = allowedTabs.includes(tab as (typeof allowedTabs)[number])
      ? `?tab=${tab}`
      : "";
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

    for (const v of allVertices) {
      const refs = v.references ?? [];
      if (!q) {
        byTab.vertices.push(v);
        if (v.tags?.length) byTab.tags.push(v);
        if (refs.some((r) => r.type === "note")) byTab.notes.push(v);
        if (refs.some((r) => r.type === "image")) byTab.images.push(v);
        if (refs.some((r) => r.type === "url")) byTab.links.push(v);
        byTab.properties.push(v);
        continue;
      }
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
            (match(r.alt) || match(r.description) || match(r.path))
        )
      ) {
        byTab.images.push(v);
      }
      if (
        refs.some(
          (r) => r.type === "url" && (match(r.url) || match((r as { title?: string }).title))
        )
      ) {
        byTab.links.push(v);
      }
    }
    return byTab;
  }, [allVertices, search]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const selectTheme = (next: ThemePreference) => {
    setPreference(next);
    handleClose();
  };

  const themeSection = (
    <>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 2, py: 1, display: "block" }}
      >
        Theme
      </Typography>
      <Divider />

      <MenuItem
        selected={preference === "system"}
        onClick={() => selectTheme("system")}
      >
        <ListItemIcon>
          <BrightnessAutoOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Auto (system)" />
      </MenuItem>

      <MenuItem
        selected={preference === "light"}
        onClick={() => selectTheme("light")}
      >
        <ListItemIcon>
          <LightModeOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Light" />
      </MenuItem>

      <MenuItem
        selected={preference === "dark"}
        onClick={() => selectTheme("dark")}
      >
        <ListItemIcon>
          <DarkModeOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Dark" />
      </MenuItem>
    </>
  );

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar
        sx={{
          minHeight: 64,
          gap: 2,
        }}
      >
        <Box
          role="button"
          aria-label={`${APP_NAME} home`}
          onClick={() => navigate("/")}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flex: 1,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <Box
            component="img"
            src="/images/logo.png"
            alt="Mind Capsule logo"
            sx={{
              width: 32,
              height: 32,
              userSelect: "none",
            }}
          />

          <Typography
            variant="h6"
            color="text.primary"
            component="h1"
            sx={{ fontWeight: 800 }}
          >
            {APP_NAME}
          </Typography>
        </Box>

        <Tooltip title="Search">
          <IconButton
            aria-label="open search menu"
            onClick={() => setSearchOpen(true)}
            sx={(theme) => ({
              color:
                theme.palette.mode === "light"
                  ? theme.palette.text.secondary
                  : theme.palette.text.primary,

              borderRadius: 2,

              "&:hover": {
                backgroundColor: theme.palette.action.hover,
                color:
                  theme.palette.mode === "light"
                    ? theme.palette.text.primary
                    : theme.palette.text.primary,
              },
            })}
          >
            <SearchOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title="Settings">
          <IconButton
            onClick={handleOpen}
            aria-label="open settings menu"
            aria-controls={open ? "settings-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
            sx={(theme) => ({
              color:
                theme.palette.mode === "light"
                  ? theme.palette.text.secondary
                  : theme.palette.text.primary,

              borderRadius: 2,

              "&:hover": {
                backgroundColor: theme.palette.action.hover,
                color:
                  theme.palette.mode === "light"
                    ? theme.palette.text.primary
                    : theme.palette.text.primary,
              },

              ...(open && {
                backgroundColor: theme.palette.action.selected,
                color: theme.palette.text.primary,
              }),
            })}
          >
            <SettingsOutlinedIcon />
          </IconButton>
        </Tooltip>

        <Menu
          id="settings-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            list: {
              dense: true,
              "aria-label": "settings",
            },
          }}
        >
          {themeSection}
        </Menu>

        <Dialog
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>Search</DialogTitle>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              autoFocus
              placeholder="Search vertices, tags, notes, links…"
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
            <List dense>
              {[
                filtered.vertices,
                filtered.properties,
                filtered.tags,
                filtered.notes,
                filtered.images,
                filtered.links,
              ][searchTab].map((v) => {
                const tabName = [
                  "children",
                  "properties",
                  "tags",
                  "notes",
                  "images",
                  "urls",
                ][searchTab];
                return (
                  <ListItemButton
                    key={`${v.id}-${tabName}`}
                    onClick={() => {
                      const path = buildPath(v, tabName);
                      navigate(path);
                      setSearchOpen(false);
                    }}
                  >
                    <ListItemText primary={v.title} secondary={`/${tabName}`} />
                  </ListItemButton>
                );
              })}
              {[
                filtered.vertices,
                filtered.properties,
                filtered.tags,
                filtered.notes,
                filtered.images,
                filtered.links,
              ][searchTab].length === 0 && (
                <Typography color="text.secondary" sx={{ px: 1, py: 2 }}>
                  No results.
                </Typography>
              )}
            </List>
          </DialogContent>
        </Dialog>
      </Toolbar>
    </AppBar>
  );
};
