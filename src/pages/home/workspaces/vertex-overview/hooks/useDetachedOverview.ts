import * as React from "react";
import type { TFunction } from "i18next";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import type { VertexItem } from "../../vertices/vertex-grid/VertexGrid";
import type { DetachedOverviewProps } from "../types";

export type DetachedProject = {
  name: string;
  path: string;
  workspace: Workspace;
};

export type DetachedOverviewState = {
  items: DetachedProject[];
  vertexItems: VertexItem[];
  detachedById: Map<string, DetachedProject>;
  loading: boolean;
  error: string | null;
  associateTarget: DetachedProject | null;
  createTarget: DetachedProject | null;
  deleteTarget: DetachedProject | null;
  createError: string | null;
};

export type DetachedOverviewActions = {
  setAssociateTarget: (target: DetachedProject | null) => void;
  setCreateTarget: (target: DetachedProject | null) => void;
  setDeleteTarget: (target: DetachedProject | null) => void;
  setCreateError: (error: string | null) => void;
  handleOpenFolder: (path: string) => Promise<void>;
  handleCreateFromDetached: (data: { title: string; thumbnail?: string }) => Promise<void>;
  handleDeleteDetached: (target: DetachedProject) => Promise<void>;
};

type UseDetachedOverviewParams = {
  props: DetachedOverviewProps | null;
  t: TFunction;
};

const getAssetDirectory = (workspacePath: string, vertexId: string) => {
  const trimmed = workspacePath.replace(/[\\/]+$/, "");
  return `${trimmed}/${vertexId}`;
};

export const useDetachedOverview = ({
  props,
  t,
}: UseDetachedOverviewParams): DetachedOverviewState & DetachedOverviewActions => {
  const [items, setItems] = React.useState<DetachedProject[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [associateTarget, setAssociateTarget] =
    React.useState<DetachedProject | null>(null);
  const [createTarget, setCreateTarget] =
    React.useState<DetachedProject | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<DetachedProject | null>(null);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const loadDetached = React.useCallback(async () => {
    if (!props) return;
    setLoading(true);
    setError(null);
    try {
      const { isTauri } = await import("@tauri-apps/api/core");
      if (!isTauri()) {
        setItems([]);
        return;
      }
      const fs = await getFileSystem();
      const vertices = await fs.getAllVertices();
      const knownVertexIds = new Set(vertices.map((v) => v.id));
      const { readDir } = await import("@tauri-apps/plugin-fs");

      const next: DetachedProject[] = [];
      for (const ws of props.workspaces) {
        const entries = await readDir(ws.path);
        entries.forEach((entry) => {
          if (!entry.isDirectory) return;
          const name = entry.name?.trim();
          if (!name) return;
          if (name.startsWith(".")) return;
          if (knownVertexIds.has(name)) return;
          const path = `${ws.path.replace(/[\\/]+$/, "")}/${name}`;
          next.push({ name, path, workspace: ws });
        });
      }
      next.sort((a, b) => a.name.localeCompare(b.name));
      setItems(next);
      props.onDetachedCountChange?.(next.length);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("detachedTab.errors.load")
      );
      setItems([]);
      props.onDetachedCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [props, t]);

  React.useEffect(() => {
    if (!props) return;
    loadDetached();
  }, [props, loadDetached]);

  const handleOpenFolder = async (path: string) => {
    if (!props) return;
    try {
      const { isTauri, invoke } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        await invoke("fs_open_path", { path });
        return;
      }
      window.open(encodeURI(`file://${path}`), "_blank", "noreferrer");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("detachedTab.errors.open")
      );
    }
  };

  const handleCreateFromDetached = async (data: {
    title: string;
    thumbnail?: string;
  }) => {
    if (!props || !createTarget) return;
    setCreateError(null);
    try {
      const fs = await getFileSystem();
      const now = new Date().toISOString();
      const vertex: Vertex = {
        id: crypto.randomUUID(),
        title: data.title,
        asset_directory: "",
        parent_id: null,
        workspace_id: createTarget.workspace.id,
        default_tab: "items",
        created_at: now,
        updated_at: now,
        tags: [],
        thumbnail_path: data.thumbnail,
      };
      await fs.createVertex(vertex);

      const { isTauri } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        const { remove, rename } = await import("@tauri-apps/plugin-fs");
        const assetDirectory = getAssetDirectory(
          createTarget.workspace.path,
          vertex.id
        );
        await remove(assetDirectory, { recursive: true });
        await rename(createTarget.path, assetDirectory);
      }

      setCreateTarget(null);
      setAssociateTarget(null);
      await props.onChanged();
      await loadDetached();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : t("detachedTab.errors.create")
      );
    }
  };

  const handleDeleteDetached = async (target: DetachedProject) => {
    if (!props) return;
    setError(null);
    try {
      const { isTauri } = await import("@tauri-apps/api/core");
      if (!isTauri()) return;
      const { remove } = await import("@tauri-apps/plugin-fs");
      await remove(target.path, { recursive: true });
      await loadDetached();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("detachedTab.errors.delete")
      );
    }
  };

  const vertexItems = React.useMemo<VertexItem[]>(() => {
    if (!props) return [];
    return items.map((item) => ({
      vertex: {
        id: item.name,
        title: item.name,
        asset_directory: "",
        parent_id: null,
        workspace_id: item.workspace.id,
        created_at: "",
        updated_at: "",
        tags: [],
      },
      workspace: item.workspace,
    }));
  }, [items, props]);

  const detachedById = React.useMemo(
    () => new Map(items.map((item) => [item.name, item])),
    [items]
  );

  return {
    items,
    vertexItems,
    detachedById,
    loading,
    error,
    associateTarget,
    createTarget,
    deleteTarget,
    createError,
    setAssociateTarget,
    setCreateTarget,
    setDeleteTarget,
    setCreateError,
    handleOpenFolder,
    handleCreateFromDetached,
    handleDeleteDetached,
  };
};
