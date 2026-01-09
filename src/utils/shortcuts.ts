import { detectOperatingSystem, type OperatingSystem } from "./os";

export type ShortcutAction = "openSearch" | "openSettings";

export type ShortcutDefinition = {
  keys: Array<"ctrl" | "meta" | "alt" | "shift" | string>;
  display: string;
};

const SHORTCUTS: Record<
  ShortcutAction,
  Record<OperatingSystem | "default", ShortcutDefinition>
> = {
  openSearch: {
    macOS: { keys: ["meta", "f"], display: "⌘ + F" },
    Windows: { keys: ["ctrl", "f"], display: "Ctrl + F" },
    Linux: { keys: ["ctrl", "f"], display: "Ctrl + F" },
    Android: { keys: ["ctrl", "f"], display: "Ctrl + F" },
    iOS: { keys: ["ctrl", "f"], display: "Ctrl + F" },
    Unknown: { keys: ["ctrl", "f"], display: "Ctrl + F" },
    default: { keys: ["ctrl", "f"], display: "Ctrl + F" },
  },
  openSettings: {
    macOS: { keys: ["meta", "o"], display: "⌘ + O" },
    Windows: { keys: ["ctrl", "o"], display: "Ctrl + O" },
    Linux: { keys: ["ctrl", "o"], display: "Ctrl + O" },
    Android: { keys: ["ctrl", "o"], display: "Ctrl + O" },
    iOS: { keys: ["ctrl", "o"], display: "Ctrl + O" },
    Unknown: { keys: ["ctrl", "o"], display: "Ctrl + O" },
    default: { keys: ["ctrl", "o"], display: "Ctrl + O" },
  },
};

export function getShortcut(
  action: ShortcutAction,
  os?: OperatingSystem
): ShortcutDefinition {
  const currentOs = os ?? detectOperatingSystem();
  return SHORTCUTS[action][currentOs] ?? SHORTCUTS[action].default;
}

export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ShortcutDefinition
): boolean {
  const keyFromCode =
    typeof event.code === "string" && event.code.startsWith("Key")
      ? event.code.replace("Key", "").toLowerCase()
      : undefined;
  const key = keyFromCode ?? event.key.toLowerCase();
  const wantsCtrl = shortcut.keys.includes("ctrl");
  const wantsMeta = shortcut.keys.includes("meta");
  const wantsAlt = shortcut.keys.includes("alt");
  const wantsShift = shortcut.keys.includes("shift");
  const mainKey = shortcut.keys.find(
    (k) => !["ctrl", "meta", "alt", "shift"].includes(k)
  );

  if (wantsCtrl !== event.ctrlKey) return false;
  if (wantsMeta !== event.metaKey) return false;
  if (wantsAlt !== event.altKey) return false;
  if (wantsShift !== event.shiftKey) return false;
  if (mainKey && key !== mainKey) return false;

  return true;
}
