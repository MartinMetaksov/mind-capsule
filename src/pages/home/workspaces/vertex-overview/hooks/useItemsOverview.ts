import * as React from "react";
import type { TFunction } from "i18next";

import type { Vertex } from "@/core/vertex";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { matchesShortcut, type ShortcutDefinition } from "@/utils/shortcuts";
import type { CreateFabHandle } from "../../components/create-fab/CreateFab";
import type { VertexItem } from "../../vertices/vertex-grid/VertexGrid";
import type { ItemsOverviewProps } from "../types";

export type ItemsOverviewState = {
  items: VertexItem[];
  loading: boolean;
  error: string | null;
  createOpen: boolean;
  createError: string | null;
  confirmDelete: VertexItem | null;
  emptyLabel: string;
  editingLabel: boolean;
  labelDraft: string;
  labelSaving: boolean;
  labelInputRef: React.RefObject<HTMLInputElement>;
};

export type ItemsOverviewActions = {
  setCreateOpen: (open: boolean) => void;
  setCreateError: (error: string | null) => void;
  setConfirmDelete: (item: VertexItem | null) => void;
  setEditingLabel: (editing: boolean) => void;
  setLabelDraft: (value: string) => void;
  commitLabel: (nextValue?: string) => Promise<void>;
  createItem: (data: { title: string; thumbnail?: string }) => Promise<void>;
  deleteItem: (item: VertexItem) => Promise<void>;
  refreshItems: () => Promise<void>;
};

type UseItemsOverviewParams = {
  props: ItemsOverviewProps | null;
  t: TFunction;
  createShortcut: ShortcutDefinition;
  fabRef: React.RefObject<CreateFabHandle | null>;
};

export const useItemsOverview = ({
  props,
  t,
  createShortcut,
  fabRef,
}: UseItemsOverviewParams): ItemsOverviewState & ItemsOverviewActions => {
  const [items, setItems] = React.useState<VertexItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<VertexItem | null>(
    null
  );
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [editingLabel, setEditingLabel] = React.useState(false);
  const [labelDraft, setLabelDraft] = React.useState(props?.label ?? "");
  const [labelSaving, setLabelSaving] = React.useState(false);
  const labelInputRef = React.useRef<HTMLInputElement | null>(null);

  const emptyLabel = React.useMemo(() => {
    if (!props) return "items";
    const kind = props.vertex.items_behavior?.child_kind?.trim();
    if (!kind) return "items";
    return kind;
  }, [props]);

  React.useEffect(() => {
    if (!props) return;
    if (!editingLabel) {
      setLabelDraft(props.label);
    }
  }, [editingLabel, props]);

  React.useEffect(() => {
    if (!props) return;
    if (!editingLabel || !labelInputRef.current) return;
    labelInputRef.current.focus();
    labelInputRef.current.select();
  }, [editingLabel, props]);

  const commitLabel = React.useCallback(
    async (nextValue?: string) => {
      if (!props) return;
      const trimmed = (nextValue ?? labelDraft).trim();
      const nextKind = trimmed.length > 0 ? trimmed : "";
      const currentKind = props.vertex.items_behavior?.child_kind ?? "";
      setEditingLabel(false);
      if (nextKind === currentKind) {
        return;
      }
      try {
        setLabelSaving(true);
        const fs = await getFileSystem();
        const updated: Vertex = {
          ...props.vertex,
          items_behavior: {
            child_kind: nextKind,
            display: props.vertex.items_behavior?.display ?? "grid",
          },
          updated_at: new Date().toISOString(),
        };
        await fs.updateVertex(updated);
        await props.onVertexUpdated?.(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("itemsTab.errors.update"));
      } finally {
        setLabelSaving(false);
      }
    },
    [labelDraft, props, t]
  );

  const refreshItems = React.useCallback(async () => {
    if (!props) return;
    setLoading(true);
    setError(null);
    try {
      const fs = await getFileSystem();
      const vertices = await fs.getVertices(props.vertex.id);
      setItems(vertices.map((v) => ({ vertex: v, workspace: props.workspace })));
    } catch (err) {
      console.error("Failed to load item vertices:", err);
      setError(err instanceof Error ? err.message : t("itemsTab.errors.load"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [props, t]);

  React.useEffect(() => {
    if (!props) return;
    refreshItems();
  }, [props?.vertex.id, refreshItems, props]);

  React.useEffect(() => {
    if (!props) return;
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, createShortcut)) {
        e.preventDefault();
        fabRef.current?.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createShortcut, fabRef, props]);

  const createItem = React.useCallback(
    async (data: { title: string; thumbnail?: string }) => {
      if (!props) return;
      try {
        const fs = await getFileSystem();
        const now = new Date().toISOString();
        const newVertex: Vertex = {
          id: crypto.randomUUID(),
          title: data.title,
          asset_directory: "",
          parent_id: props.vertex.id,
          workspace_id: null,
          default_tab: "items",
          created_at: now,
          updated_at: now,
          tags: [],
          thumbnail_path: data.thumbnail,
        };
        await fs.createVertex(newVertex);
        setCreateOpen(false);
        await refreshItems();
      } catch (err) {
        setCreateError(
          err instanceof Error ? err.message : t("itemsTab.errors.create")
        );
      }
    },
    [props, refreshItems, t]
  );

  const deleteItem = React.useCallback(
    async (item: VertexItem) => {
      try {
        const fs = await getFileSystem();
        await fs.removeVertex(item.vertex);
        setConfirmDelete(null);
        await refreshItems();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete item.");
      }
    },
    [refreshItems]
  );

  return {
    items,
    loading,
    error,
    createOpen,
    createError,
    confirmDelete,
    emptyLabel,
    editingLabel,
    labelDraft,
    labelSaving,
    labelInputRef,
    setCreateOpen,
    setCreateError,
    setConfirmDelete,
    setEditingLabel,
    setLabelDraft,
    commitLabel,
    createItem,
    deleteItem,
    refreshItems,
  };
};
