import { Store } from "@tauri-apps/plugin-store";

const store = await Store.load("settings.json");

export const SettingsStore = {
  async getWorkspacePath(): Promise<string | null> {
    return (await store.get<string>("workspacePath")) ?? null;
  },
  async setWorkspacePath(path: string): Promise<void> {
    await store.set("workspacePath", path);
    await store.save();
  },
};