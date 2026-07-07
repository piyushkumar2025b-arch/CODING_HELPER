// ─────────────────────────────────────────────
//  CodeMind — useExecutor React Hook
// ─────────────────────────────────────────────
import { useState, useCallback } from "react";
import { executeCode } from "../utils/executor";
import type { ExecutionResult, Language } from "../types";

interface UseExecutorOptions {
  judge0ApiKey: string;
}

export function useExecutor({ judge0ApiKey }: UseExecutorOptions) {
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (code: string, language: Language, stdin = "") => {
      if (!code.trim()) return;

      setRunning(true);
      setError(null);
      setResult(null);

      try {
        const res = await executeCode(code, language, stdin, judge0ApiKey);
        setResult(res);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setRunning(false);
      }
    },
    [judge0ApiKey]
  );

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, running, error, run, clear };
}
