type EnvContext = {
  VITE_APP_CONTEXT?: string;
};

const envContext =
  (import.meta as ImportMeta & { env?: EnvContext }).env?.VITE_APP_CONTEXT?.trim() ||
  "web";

export const STORAGE_PREFIX = `mind-capsule.${envContext}`;
export const SEEDED_KEY = `${STORAGE_PREFIX}.seeded`;
export const WORKSPACE_KEY_PREFIX = `${STORAGE_PREFIX}.ws-`;
export const VERTEX_KEY_PREFIX = `${STORAGE_PREFIX}.vert-`;
export const ASSET_KEY_PREFIX = `${STORAGE_PREFIX}.assets-`;

export function workspaceStorageKey(id: string): string {
  return `${WORKSPACE_KEY_PREFIX}${id}.json`;
}

export function vertexStorageKey(id: string): string {
  return `${VERTEX_KEY_PREFIX}${id}.json`;
}

export function assetStorageKey(id: string): string {
  return `${ASSET_KEY_PREFIX}${id}.json`;
}
