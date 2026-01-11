import type { FileSystem } from "./fileSystem";

/**
 * Returns the correct adapter for the current runtime.
 * - Tauri: real filesystem + store + invoke
 * - Web: decoy adapter (UI-only mode)
 */
export async function getFileSystem(): Promise<FileSystem> {
  // Importing @tauri-apps/api/core at top-level breaks web mode,
  // so we dynamically import it here.
  try {
    const { isTauri } = await import("@tauri-apps/api/core");
    if (isTauri()) {
      const mod = await import("./tauri/fileSystem");
      return mod.fileSystem;
    }
  } catch {
    // ignore; not running in Tauri
  }

  const mod = await import("./web/inMemoryFileSystemMock");
  return mod.inMemoryFileSystemMock;
}
