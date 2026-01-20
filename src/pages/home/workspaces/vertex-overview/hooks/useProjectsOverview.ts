import * as React from "react";
import type { TFunction } from "i18next";

import type { Vertex } from "@/core/vertex";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import { matchesShortcut, type ShortcutDefinition } from "@/utils/shortcuts";
import type { CreateFabHandle } from "../../components/create-fab/CreateFab";
import type { VertexItem } from "../views/grid/VertexGrid";
import type { ProjectsOverviewProps } from "../types";

export type ProjectsOverviewState = {
  fabAnchor: HTMLElement | null;
  editorOpen: boolean;
  selectedWorkspace: ProjectsOverviewProps["workspaces"][number] | null;
  error: string | null;
  confirmDelete: VertexItem | null;
  workspaceQuery: string;
  activeWorkspaceIndex: number;
  filteredWorkspaces: ProjectsOverviewProps["workspaces"];
};

export type ProjectsOverviewActions = {
  setFabAnchor: (anchor: HTMLElement | null) => void;
  setEditorOpen: (open: boolean) => void;
  setSelectedWorkspace: (
    workspace: ProjectsOverviewProps["workspaces"][number] | null
  ) => void;
  setError: (error: string | null) => void;
  setConfirmDelete: (item: VertexItem | null) => void;
  setWorkspaceQuery: (value: string) => void;
  setActiveWorkspaceIndex: (index: number) => void;
  handleWorkspaceKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  handleCreateProject: (data: { title: string; thumbnail?: string }) => Promise<void>;
  handleCreateProjectInWorkspace: (
    ws: ProjectsOverviewProps["workspaces"][number]
  ) => void;
};

type UseProjectsOverviewParams = {
  props: ProjectsOverviewProps | null;
  t: TFunction;
  createShortcut: ShortcutDefinition;
  prevShortcut: ShortcutDefinition;
  nextShortcut: ShortcutDefinition;
  fabRef: React.RefObject<CreateFabHandle | null>;
};

export const useProjectsOverview = ({
  props,
  t,
  createShortcut,
  prevShortcut,
  nextShortcut,
  fabRef,
}: UseProjectsOverviewParams): ProjectsOverviewState & ProjectsOverviewActions => {
  const [fabAnchor, setFabAnchor] = React.useState<HTMLElement | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [selectedWorkspace, setSelectedWorkspace] =
    React.useState<ProjectsOverviewProps["workspaces"][number] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<VertexItem | null>(
    null
  );
  const [workspaceQuery, setWorkspaceQuery] = React.useState("");
  const [activeWorkspaceIndex, setActiveWorkspaceIndex] = React.useState(-1);

  const filteredWorkspaces = React.useMemo(() => {
    if (!props) return [];
    const q = workspaceQuery.trim().toLowerCase();
    if (!q) return props.workspaces;
    return props.workspaces.filter((ws) => ws.name.toLowerCase().includes(q));
  }, [props, workspaceQuery]);

  React.useEffect(() => {
    if (!props) return;
    if (filteredWorkspaces.length === 0) {
      setActiveWorkspaceIndex(-1);
    } else {
      setActiveWorkspaceIndex(0);
    }
  }, [filteredWorkspaces, props]);

  const handleCreateProjectInWorkspace = (
    ws: ProjectsOverviewProps["workspaces"][number]
  ) => {
    if (!props) return;
    setSelectedWorkspace(ws);
    setEditorOpen(true);
    setError(null);
    setFabAnchor(null);
  };

  const moveActiveWorkspace = React.useCallback(
    (direction: "prev" | "next") => {
      if (filteredWorkspaces.length === 0) return;
      setActiveWorkspaceIndex((prev) => {
        if (prev === -1) return 0;
        const delta = direction === "next" ? 1 : -1;
        return (
          (prev + delta + filteredWorkspaces.length) % filteredWorkspaces.length
        );
      });
    },
    [filteredWorkspaces.length]
  );

  const handleWorkspaceKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    e
  ) => {
    if (matchesShortcut(e.nativeEvent, prevShortcut)) {
      e.preventDefault();
      moveActiveWorkspace("prev");
      return;
    }
    if (matchesShortcut(e.nativeEvent, nextShortcut)) {
      e.preventDefault();
      moveActiveWorkspace("next");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredWorkspaces[activeWorkspaceIndex];
      if (target) {
        handleCreateProjectInWorkspace(target);
      }
    }
  };

  React.useEffect(() => {
    if (!props) return;
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, createShortcut)) {
        e.preventDefault();
        const buttonEl = fabRef.current?.button;
        setFabAnchor(buttonEl ?? document.body);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createShortcut, fabRef, props]);

  const handleCreateProject = React.useCallback(
    async (data: { title: string; thumbnail?: string }) => {
      if (!props) return;
      if (!selectedWorkspace) {
        setError(t("projects.errors.selectWorkspace"));
        return;
      }
      try {
        const fs = await getFileSystem();
        const now = new Date().toISOString();
        const vertex: Vertex = {
          id: crypto.randomUUID(),
          title: data.title,
          asset_directory: "",
          parent_id: null,
          workspace_id: selectedWorkspace.id,
          default_tab: "items",
          created_at: now,
          updated_at: now,
          tags: [],
          thumbnail_path: data.thumbnail,
        };
        await fs.createVertex(vertex);
        await props.onChanged();
        setEditorOpen(false);
        setSelectedWorkspace(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("projects.errors.create")
        );
      }
    },
    [props, selectedWorkspace, t]
  );

  return {
    fabAnchor,
    editorOpen,
    selectedWorkspace,
    error,
    confirmDelete,
    workspaceQuery,
    activeWorkspaceIndex,
    filteredWorkspaces,
    setFabAnchor,
    setEditorOpen,
    setSelectedWorkspace,
    setError,
    setConfirmDelete,
    setWorkspaceQuery,
    setActiveWorkspaceIndex,
    handleWorkspaceKeyDown,
    handleCreateProject,
    handleCreateProjectInWorkspace,
  };
};
