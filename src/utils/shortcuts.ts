import { detectOperatingSystem, type OperatingSystem } from "./os";

export type ShortcutAction =
  | "openSearch"
  | "openSettings"
  | "insert"
  | "goHome"
  | "confirmDelete"
  | "cancelDelete"
  | "searchPrevResult"
  | "searchNextResult"
  | "imagePrev"
  | "imageNext"
  | "viewGrid"
  | "viewList"
  | "viewGraph"
  | "tab1"
  | "tab2"
  | "tab3"
  | "tab4"
  | "tab5"
  | "tab6";

export type ShortcutDefinition = {
  keys: Array<"ctrl" | "meta" | "alt" | "shift" | string>;
  display: string;
};

const BASE_OS: OperatingSystem[] = [
  "macOS",
  "Windows",
  "Linux",
  "Android",
  "iOS",
  "Unknown",
];

const makeUniformShortcuts = (def: ShortcutDefinition) =>
  BASE_OS.reduce(
    (acc, os) => ({ ...acc, [os]: def }),
    { default: def } as Record<OperatingSystem | "default", ShortcutDefinition>
  );

const SHORTCUTS: Record<
  ShortcutAction,
  Record<OperatingSystem | "default", ShortcutDefinition>
> = {
  openSearch: makeUniformShortcuts({ keys: ["~"], display: "~" }),
  openSettings: makeUniformShortcuts({
    keys: ["meta", "o"],
    display: "⌘ + O / Ctrl + O",
  }),
  insert: makeUniformShortcuts({
    keys: ["meta", "i"],
    display: "⌘ + I / Ctrl + I",
  }),
  goHome: makeUniformShortcuts({ keys: ["meta", "/"], display: "⌘/Ctrl + /" }),
  confirmDelete: makeUniformShortcuts({ keys: ["y"], display: "Y" }),
  cancelDelete: makeUniformShortcuts({ keys: ["n"], display: "N" }),
  searchPrevResult: makeUniformShortcuts({ keys: ["arrowup"], display: "↑" }),
  searchNextResult: makeUniformShortcuts({ keys: ["arrowdown"], display: "↓" }),
  imagePrev: makeUniformShortcuts({ keys: ["arrowleft"], display: "←" }),
  imageNext: makeUniformShortcuts({ keys: ["arrowright"], display: "→" }),
  viewGrid: makeUniformShortcuts({ keys: ["meta", "r"], display: "⌘/Ctrl + R" }),
  viewList: makeUniformShortcuts({ keys: ["meta", "l"], display: "⌘/Ctrl + L" }),
  viewGraph: makeUniformShortcuts({ keys: ["meta", "g"], display: "⌘/Ctrl + G" }),
  tab1: makeUniformShortcuts({ keys: ["meta", "1"], display: "⌘/Ctrl + 1" }),
  tab2: makeUniformShortcuts({ keys: ["meta", "2"], display: "⌘/Ctrl + 2" }),
  tab3: makeUniformShortcuts({ keys: ["meta", "3"], display: "⌘/Ctrl + 3" }),
  tab4: makeUniformShortcuts({ keys: ["meta", "4"], display: "⌘/Ctrl + 4" }),
  tab5: makeUniformShortcuts({ keys: ["meta", "5"], display: "⌘/Ctrl + 5" }),
  tab6: makeUniformShortcuts({ keys: ["meta", "6"], display: "⌘/Ctrl + 6" }),
};

export function getShortcut(
  action: ShortcutAction,
  os?: OperatingSystem
): ShortcutDefinition {
  const currentOs = os ?? detectOperatingSystem();
  const base = SHORTCUTS[action][currentOs] ?? SHORTCUTS[action].default;
  const normalizedKeys =
    currentOs === "macOS"
      ? base.keys
      : base.keys.map((key) => (key === "meta" ? "ctrl" : key));
  const normalized = { ...base, keys: normalizedKeys };

  const main = normalized.keys.find(
    (k) => !["ctrl", "meta", "alt", "shift"].includes(k)
  );
  if (!main) return normalized;

  const hasMeta = normalized.keys.includes("meta");
  const hasCtrl = normalized.keys.includes("ctrl");
  const hasAlt = normalized.keys.includes("alt");
  const hasShift = normalized.keys.includes("shift");

  const pieces: string[] = [];
  if (main === "~") {
    pieces.push("~");
  } else if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(main)) {
    const arrowMap: Record<string, string> = {
      arrowleft: "←",
      arrowright: "→",
      arrowup: "↑",
      arrowdown: "↓",
    };
    pieces.push(arrowMap[main] ?? main.toUpperCase());
  } else {
    if (hasMeta) pieces.push(currentOs === "macOS" ? "⌘" : "Ctrl");
    else if (hasCtrl) pieces.push("Ctrl");
    if (hasAlt) pieces.push("Alt");
    if (hasShift) pieces.push("Shift");
    pieces.push(main.toUpperCase());
  }

  return { ...normalized, display: pieces.join(" + ") };
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
  const isTildeShortcut = mainKey === "~";
  if (!isTildeShortcut && wantsShift !== event.shiftKey) return false;
  if (mainKey) {
    const normalizedMain = mainKey.toLowerCase();
    const matchesBackquote =
      normalizedMain === "~" &&
      (event.code === "Backquote" || key === "`" || key === "~");
    if (!matchesBackquote && key !== normalizedMain) return false;
  }

  return true;
}
