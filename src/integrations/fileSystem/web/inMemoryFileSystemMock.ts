import { Workspace } from "@/core/workspace";
import type { FileSystem } from "../fileSystem";
import { Id } from "@/core/common/id";

const STORAGE_KEY = "thought-vault.workspaces";

const workspaces: Record<Id, Workspace> = load();

function load(): Record<Id, Workspace> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Mock implementation
 */
export const inMemoryFileSystemMock: FileSystem = {
  async createWorkspace(workspace: Workspace): Promise<void> {
    if (workspaces[workspace.id]) {
      throw new Error(`Workspace ${workspace.id} already exists.`);
    }

    workspaces[workspace.id] = {
      ...workspace,
      created_at: workspace.created_at ?? now(),
      updated_at: workspace.updated_at ?? now(),
    };

    persist();
  },

  async selectWorkspaceDirectory(): Promise<string | null> {
    // Simulate user "selecting" a directory
    return "memory://workspace";
  },

  async getWorkspaces(): Promise<Workspace[]> {
    return Object.values(workspaces);
  },

  async getWorkspace(workspace_id: Id): Promise<Workspace | null> {
    return workspaces[workspace_id] ?? null;
  },

  async updateWorkspace(new_workspace: Workspace): Promise<void> {
    if (!workspaces[new_workspace.id]) {
      throw new Error(`Workspace ${new_workspace.id} does not exist.`);
    }

    workspaces[new_workspace.id] = {
      ...new_workspace,
      updated_at: now(),
    };

    persist();
  },

  async removeWorkspace(workspace_id: Id): Promise<void> {
    if (!workspaces[workspace_id]) return;

    delete workspaces[workspace_id];
    persist();
  },
};
