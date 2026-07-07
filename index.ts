// ─────────────────────────────────────────────
//  CodeMind — Shared TypeScript Types
// ─────────────────────────────────────────────

export type Language =
  | "javascript" | "typescript" | "python" | "java"
  | "cpp" | "c" | "rust" | "go" | "kotlin" | "swift"
  | "html" | "css" | "sql" | "bash";

export type Mode =
  | "solve" | "debug" | "explain" | "review" | "convert"
  | "generate" | "optimize" | "test";

export type Platform = "leetcode" | "codeforces" | "general";

export type Difficulty = "easy" | "medium" | "hard";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  mode?: Mode;
  language?: Language;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  time?: number;
  memory?: number;
}

export interface QuizQuestion {
  id: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: Difficulty;
}

export interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  answers: (number | null)[];
  finished: boolean;
  streak: number;
}

export interface RoadmapTopic {
  id: string;
  name: string;
  done: boolean;
  resources?: string[];
}

export interface RoadmapPhase {
  id: string;
  title: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  topics: RoadmapTopic[];
}

export interface GitHubGist {
  id: string;
  description: string;
  files: Record<string, { filename: string; content: string; language: string }>;
  created_at: string;
  updated_at: string;
  public: boolean;
  html_url: string;
}

export interface NpmPackage {
  name: string;
  version: string;
  description: string;
  homepage?: string;
  repository?: { url: string };
  weeklyDownloads?: number;
  license?: string;
  keywords?: string[];
}

export interface AppSettings {
  geminiApiKey: string;
  judge0ApiKey: string;
  githubToken: string;
  theme: "dark" | "light";
  fontSize: number;
  tabSize: 2 | 4;
  wordWrap: boolean;
  autoFormat: boolean;
  notifications: boolean;
}

export interface Tab {
  id: string;
  label: string;
  icon: string;
  panel: string;
}
