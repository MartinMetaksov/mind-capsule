import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { SettingsStore } from "@/integrations/fileSystem/settingsStore";

export async function pickWorkspaceFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select your Story Master workspace folder",
  });

  if (!selected || Array.isArray(selected)) return null;

  const workspacePath = selected;

  await invoke("workspace_init_if_missing", { workspacePath });
  await SettingsStore.setWorkspacePath(workspacePath);

  return workspacePath;
}
