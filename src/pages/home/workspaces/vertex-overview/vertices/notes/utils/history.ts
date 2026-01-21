export type NoteHistoryItem = {
  text: string;
  at: string;
};

const historyKeyFor = (vertexId: string, name: string) =>
  `notesHistory:${vertexId}:${name}`;

export const loadHistory = (vertexId: string, name: string): NoteHistoryItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(historyKeyFor(vertexId, name));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NoteHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveHistory = (
  vertexId: string,
  name: string,
  history: NoteHistoryItem[]
) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(historyKeyFor(vertexId, name), JSON.stringify(history));
};
