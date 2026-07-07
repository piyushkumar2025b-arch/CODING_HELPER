// ─────────────────────────────────────────────
//  CodeMind — localStorage Wrapper
// ─────────────────────────────────────────────
import type { AppSettings, Message } from "../types";

const KEYS = {
  SETTINGS: "codemind_settings",
  HISTORY: "codemind_history",
  ROADMAP: "codemind_roadmap",
  SNIPPETS: "codemind_snippets",
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: "",
  judge0ApiKey: "",
  githubToken: "",
  theme: "dark",
  fontSize: 13,
  tabSize: 2,
  wordWrap: false,
  autoFormat: false,
  notifications: true,
};

// ── Generic helpers ───────────────────────────

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn("Storage write failed for key:", key);
  }
}

function remove(key: string): void {
  localStorage.removeItem(key);
}

// ── Settings ──────────────────────────────────

export function loadSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<AppSettings>>(KEYS.SETTINGS, {}) };
}

export function saveSettings(settings: Partial<AppSettings>): void {
  write(KEYS.SETTINGS, { ...loadSettings(), ...settings });
}

export function clearSettings(): void {
  remove(KEYS.SETTINGS);
}

// ── Conversation History ──────────────────────

const MAX_HISTORY = 100;

export function loadHistory(): Message[] {
  return read<Message[]>(KEYS.HISTORY, []);
}

export function appendMessage(msg: Message): void {
  const history = loadHistory();
  history.push(msg);
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  write(KEYS.HISTORY, history);
}

export function clearHistory(): void {
  remove(KEYS.HISTORY);
}

// ── Roadmap progress ──────────────────────────

export function loadRoadmapProgress(): Record<string, boolean> {
  return read<Record<string, boolean>>(KEYS.ROADMAP, {});
}

export function toggleRoadmapTopic(topicId: string): boolean {
  const progress = loadRoadmapProgress();
  progress[topicId] = !progress[topicId];
  write(KEYS.ROADMAP, progress);
  return progress[topicId];
}

// ── Code Snippets ─────────────────────────────

export interface Snippet {
  id: string;
  name: string;
  language: string;
  code: string;
  createdAt: number;
}

export function loadSnippets(): Snippet[] {
  return read<Snippet[]>(KEYS.SNIPPETS, []);
}

export function saveSnippet(snippet: Omit<Snippet, "id" | "createdAt">): Snippet {
  const snippets = loadSnippets();
  const newSnippet: Snippet = {
    ...snippet,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  snippets.unshift(newSnippet);
  write(KEYS.SNIPPETS, snippets.slice(0, 50)); // max 50
  return newSnippet;
}

export function deleteSnippet(id: string): void {
  const snippets = loadSnippets().filter((s) => s.id !== id);
  write(KEYS.SNIPPETS, snippets);
}
