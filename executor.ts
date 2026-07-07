// ─────────────────────────────────────────────
//  CodeMind — Code Execution via Judge0
// ─────────────────────────────────────────────
import type { ExecutionResult, Language } from "../types";

const JUDGE0_BASE = "https://judge0-ce.p.rapidapi.com";

/** Map CodeMind language IDs → Judge0 language IDs */
const JUDGE0_LANG_MAP: Partial<Record<Language, number>> = {
  python: 71,
  javascript: 63,
  typescript: 74,
  java: 62,
  cpp: 54,
  c: 50,
  rust: 73,
  go: 60,
  kotlin: 78,
  bash: 46,
};

export function isNativeLanguage(lang: Language): boolean {
  return lang === "javascript" || lang === "html" || lang === "css";
}

export async function executeCode(
  code: string,
  language: Language,
  stdin: string,
  judge0ApiKey: string
): Promise<ExecutionResult> {
  if (isNativeLanguage(language)) {
    return executeNative(code, language);
  }

  if (!judge0ApiKey) {
    throw new Error(
      "Judge0 API key required for compiled languages. Add it via the ⚙ icon."
    );
  }

  const langId = JUDGE0_LANG_MAP[language];
  if (!langId) {
    throw new Error(`Language '${language}' is not supported for execution.`);
  }

  return executeJudge0(code, langId, stdin, judge0ApiKey);
}

// ── Native JS execution (sandboxed) ───────────

function executeNative(
  code: string,
  _language: Language
): ExecutionResult {
  const logs: string[] = [];
  const errors: string[] = [];

  const fakeConsole = {
    log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
    error: (...args: unknown[]) => errors.push(args.map(String).join(" ")),
    warn: (...args: unknown[]) => logs.push(`⚠ ${args.map(String).join(" ")}`),
    info: (...args: unknown[]) => logs.push(`ℹ ${args.map(String).join(" ")}`),
  };

  try {
    const fn = new Function("console", code);
    fn(fakeConsole);
    return {
      stdout: logs.join("\n"),
      stderr: errors.join("\n"),
      exitCode: errors.length > 0 ? 1 : 0,
    };
  } catch (err) {
    return {
      stdout: logs.join("\n"),
      stderr: String(err),
      exitCode: 1,
    };
  }
}

// ── Judge0 execution ──────────────────────────

async function executeJudge0(
  code: string,
  languageId: number,
  stdin: string,
  apiKey: string
): Promise<ExecutionResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-RapidAPI-Key": apiKey,
    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
  };

  // Submit
  const submitRes = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=true&wait=false`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      language_id: languageId,
      source_code: btoa(unescape(encodeURIComponent(code))),
      stdin: stdin ? btoa(unescape(encodeURIComponent(stdin))) : "",
    }),
  });

  if (!submitRes.ok) throw new Error(`Judge0 submit failed: HTTP ${submitRes.status}`);
  const { token } = (await submitRes.json()) as { token: string };

  // Poll
  for (let i = 0; i < 15; i++) {
    await sleep(800);
    const pollRes = await fetch(
      `${JUDGE0_BASE}/submissions/${token}?base64_encoded=true`,
      { headers }
    );
    if (!pollRes.ok) continue;

    const result = (await pollRes.json()) as {
      status: { id: number; description: string };
      stdout?: string;
      stderr?: string;
      compile_output?: string;
      time?: string;
      memory?: number;
    };

    if (result.status.id <= 2) continue; // In queue / processing

    const decode = (b64?: string) =>
      b64 ? decodeURIComponent(escape(atob(b64))) : "";

    return {
      stdout: decode(result.stdout),
      stderr: decode(result.stderr) || decode(result.compile_output),
      exitCode: result.status.id === 3 ? 0 : 1,
      time: result.time ? parseFloat(result.time) * 1000 : undefined,
      memory: result.memory,
    };
  }

  throw new Error("Execution timed out");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
