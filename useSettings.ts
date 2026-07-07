// ─────────────────────────────────────────────
//  CodeMind — useSettings React Hook
// ─────────────────────────────────────────────
import { useState, useCallback } from "react";
import { loadSettings, saveSettings } from "../utils/storage";
import type { AppSettings } from "../types";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const setApiKey = useCallback(
    (key: string) => update({ geminiApiKey: key }),
    [update]
  );

  const setJudge0Key = useCallback(
    (key: string) => update({ judge0ApiKey: key }),
    [update]
  );

  const setGithubToken = useCallback(
    (token: string) => update({ githubToken: token }),
    [update]
  );

  return {
    settings,
    update,
    setApiKey,
    setJudge0Key,
    setGithubToken,
    isConnected: !!settings.geminiApiKey,
    hasRunner: !!settings.judge0ApiKey,
  };
}
