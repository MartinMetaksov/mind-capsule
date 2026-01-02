import { invoke } from "@tauri-apps/api/core";
import { SettingsStore } from "@/integrations/fileSystem/tauri/settingsStore";

async function requireWorkspacePath(): Promise<string> {
  const p = await SettingsStore.getWorkspacePath();
  if (!p) throw new Error("No workspace selected.");
  return p;
}

export const WorkspaceService = {
  // async listProjects(): Promise<Project[]> {
  //   const workspacePath = await requireWorkspacePath();
  //   return invoke<Project[]>("projects_list", { workspacePath });
  // },
  // async createProject(title: string): Promise<Project> {
  //   const workspacePath = await requireWorkspacePath();
  //   return invoke<Project>("project_create", { workspacePath, title });
  // },
  // async readNote(projectId: string, noteName: string): Promise<string> {
  //   const workspacePath = await requireWorkspacePath();
  //   return invoke<string>("note_read", { workspacePath, projectId, noteName });
  // },
  // async writeNote(
  //   projectId: string,
  //   noteName: string,
  //   content: string
  // ): Promise<void> {
  //   const workspacePath = await requireWorkspacePath();
  //   await invoke("note_write", { workspacePath, projectId, noteName, content });
  // },
};
