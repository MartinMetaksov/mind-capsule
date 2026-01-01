// import type { FileSystemAdapter } from "../fileSystemAdapter";
// import { SettingsStore } from "./settingsStore";
// import { WorkspaceService } from "./workspaceService";
// import { pickWorkspaceFolder } from "./workspacePicker";
// import { invoke } from "@tauri-apps/api/core";

// export const fileSystem: FileSystemAdapter = {
//   // settings
//   getWorkspacePath: SettingsStore.getWorkspacePath,
//   setWorkspacePath: SettingsStore.setWorkspacePath,

//   // picker/init
//   pickWorkspaceFolder,
//   async createDefaultWorkspace(): Promise<string> {
//     return invoke<string>("workspace_create_default");
//   },

//   // // projects
//   // listProjects: WorkspaceService.listProjects,
//   // createProject: WorkspaceService.createProject,

//   // // notes
//   // readNote: WorkspaceService.readNote,
//   // writeNote: WorkspaceService.writeNote,
// };
