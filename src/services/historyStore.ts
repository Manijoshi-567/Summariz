export interface HistoryItem {
  id: string;
  user_id: string;
  document_name: string;
  summary_text: string;
  short_summary?: string;
  medium_summary?: string;
  long_summary?: string;
  keyPoints?: string[];
  tone: string;
  format: string;
  length: string;
  created_at: string;
}

const HISTORY_STORAGE_KEY = "summify_user_history";

function getAllHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAllHistory(items: HistoryItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
}

export function getHistoryForUser(userId: string): HistoryItem[] {
  if (!userId) return [];
  const all = getAllHistory();
  return all
    .filter((item) => item.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function saveHistoryItem(params: Omit<HistoryItem, "id" | "created_at">): HistoryItem {
  const all = getAllHistory();
  const newItem: HistoryItem = {
    ...params,
    id: "hist_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    created_at: new Date().toISOString(),
  };

  all.unshift(newItem);
  saveAllHistory(all);
  return newItem;
}

export function deleteHistoryItem(id: string): void {
  const all = getAllHistory();
  const filtered = all.filter((item) => item.id !== id);
  saveAllHistory(filtered);
}

export function clearUserHistory(userId: string): void {
  const all = getAllHistory();
  const filtered = all.filter((item) => item.user_id !== userId);
  saveAllHistory(filtered);
}
