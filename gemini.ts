// ─────────────────────────────────────────────
//  CodeMind — Gemini API Utility
// ─────────────────────────────────────────────
import type { GeminiConfig, Language, Mode } from "../types";

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.0-pro",
];

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function callGemini(
  config: GeminiConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const models = [config.model, ...MODELS.filter((m) => m !== config.model)];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${config.apiKey}`;
      const body = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          maxOutputTokens: config.maxTokens ?? 8192,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: { message?: string } })?.error?.message ??
            `HTTP ${res.status}`
        );
      }

      const data = (await res.json()) as {
        candidates: Array<{
          content: { parts: Array<{ text: string }> };
        }>;
      };
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join("");
      if (!text) throw new Error("Empty response");
      return text;
    } catch (err) {
      lastError = err as Error;
      continue;
    }
  }

  throw lastError ?? new Error("All Gemini models failed");
}

// ── Prompt builders ───────────────────────────

export function buildSystemPrompt(mode: Mode, language: Language): string {
  const langLabel = language.toUpperCase();

  const base = `You are CodeMind, an elite AI coding assistant specializing in ${langLabel}.
Always structure responses with: brief explanation → code block (if applicable) → time/space complexity → follow-up tips.
Use markdown. Code blocks must specify language. Be concise but complete.`;

  const modeInstructions: Record<Mode, string> = {
    solve: `${base}\nGenerate OPTIMAL solutions. Always provide: 1) Brute force, 2) Optimal approach. Include Big-O analysis.`,
    debug: `${base}\nIdentify ALL bugs precisely. Show the fix and explain why it was wrong. Suggest defensive patterns.`,
    explain: `${base}\nExplain code like teaching a smart junior dev. Use analogies. Break down each section. Highlight gotchas.`,
    review: `${base}\nCode review mode: security, performance, readability, best practices. Rate each on A-D scale with emoji.`,
    convert: `${base}\nConvert code faithfully to the target language. Preserve logic. Use idiomatic patterns for the target.`,
    generate: `${base}\nGenerate production-quality boilerplate with proper structure, error handling, and comments.`,
    optimize: `${base}\nProfile and optimize. Show before/after complexity. Highlight the bottleneck and the fix clearly.`,
    test: `${base}\nWrite comprehensive tests: happy path, edge cases, error cases. Use the standard testing framework for ${langLabel}.`,
  };

  return modeInstructions[mode] ?? base;
}

export function buildUserPrompt(
  mode: Mode,
  language: Language,
  question: string,
  code: string,
  platform?: string
): string {
  const parts: string[] = [];

  if (platform && platform !== "general") {
    parts.push(`Platform: ${platform.toUpperCase()}`);
  }
  if (question) parts.push(`Task: ${question}`);
  if (code) parts.push(`\`\`\`${language}\n${code}\n\`\`\``);

  const modeLabel: Record<Mode, string> = {
    solve: "Solve this problem",
    debug: "Debug this code",
    explain: "Explain this code",
    review: "Review this code",
    convert: "Convert this code",
    generate: "Generate code for",
    optimize: "Optimize this code",
    test: "Write tests for",
  };

  return `${modeLabel[mode]}: ${parts.join("\n")}`;
}
