import * as React from "react";

import type { Store } from "@tauri-apps/plugin-store";

export type AppSettingKey = "ui.showFooter" | "ui.showSettingsBar";

const LOCAL_PREFIX = "app-setting:";
const EVENT_NAME = "app-setting-changed";

let storePromise: Promise<Store> | null = null;
let isTauriPromise: Promise<boolean> | null = null;

async function isRunningInTauri(): Promise<boolean> {
  if (!isTauriPromise) {
    isTauriPromise = (async () => {
      try {
        const { isTauri } = await import("@tauri-apps/api/core");
        return isTauri();
      } catch {
        return false;
      }
    })();
  }
  return isTauriPromise;
}

async function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = (async () => {
      const { Store } = await import("@tauri-apps/plugin-store");
      return Store.load("settings.json");
    })();
  }
  return storePromise;
}

async function readSetting(key: AppSettingKey): Promise<boolean | undefined> {
  if (await isRunningInTauri()) {
    const store = await getStore();
    return store.get<boolean>(key);
  }
  const raw = window.localStorage.getItem(`${LOCAL_PREFIX}${key}`);
  if (raw === null) return undefined;
  return raw === "true";
}

async function writeSetting(key: AppSettingKey, value: boolean): Promise<void> {
  if (await isRunningInTauri()) {
    const store = await getStore();
    await store.set(key, value);
    await store.save();
    return;
  }
  window.localStorage.setItem(`${LOCAL_PREFIX}${key}`, String(value));
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: { key, value } })
  );
}

export function useAppSetting(
  key: AppSettingKey,
  defaultValue: boolean
): [boolean, (next: boolean) => void] {
  const [value, setValue] = React.useState<boolean>(defaultValue);

  React.useEffect(() => {
    let isActive = true;
    let stopListening: (() => void) | undefined;

    void (async () => {
      const stored = await readSetting(key);
      if (!isActive) return;
      setValue(stored ?? defaultValue);

      if (await isRunningInTauri()) {
        const store = await getStore();
        const unlisten = await store.onKeyChange<boolean>(key, (next) => {
          if (!isActive) return;
          setValue(next ?? defaultValue);
        });
        stopListening = () => {
          unlisten();
        };
      } else {
        const handler = (event: Event) => {
          const detail = (event as CustomEvent<{ key: string; value: boolean }>)
            .detail;
          if (detail?.key === key) {
            setValue(detail.value);
          }
        };
        window.addEventListener(
          EVENT_NAME,
          handler as EventListener
        );
        stopListening = () => {
          window.removeEventListener(
            EVENT_NAME,
            handler as EventListener
          );
        };
      }
    })();

    return () => {
      isActive = false;
      stopListening?.();
    };
  }, [defaultValue, key]);

  const setAndPersist = React.useCallback(
    (next: boolean) => {
      setValue(next);
      void writeSetting(key, next);
    },
    [key]
  );

  return [value, setAndPersist];
}
