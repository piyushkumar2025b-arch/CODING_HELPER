// ─────────────────────────────────────────────
//  CodeMind — useGemini React Hook
// ─────────────────────────────────────────────
import { useState, useCallback } from "react";
import { callGemini, buildSystemPrompt, buildUserPrompt } from "../utils/gemini";
import type { Language, Mode } from "../types";

interface UseGeminiOptions {
  apiKey: string;
  model?: string;
}

interface GeminiState {
  response: string;
  loading: boolean;
  error: string | null;
}

export function useGemini({ apiKey, model = "gemini-2.5-flash" }: UseGeminiOptions) {
  const [state, setState] = useState<GeminiState>({
    response: "",
    loading: false,
    error: null,
  });

  const generate = useCallback(
    async (
      mode: Mode,
      language: Language,
      question: string,
      code: string,
      platform?: string
    ) => {
      if (!apiKey) {
        setState((s) => ({ ...s, error: "API key required" }));
        return null;
      }

      setState({ response: "", loading: true, error: null });

      try {
        const systemPrompt = buildSystemPrompt(mode, language);
        const userMessage = buildUserPrompt(mode, language, question, code, platform);

        const text = await callGemini(
          { apiKey, model },
          systemPrompt,
          userMessage
        );

        setState({ response: text, loading: false, error: null });
        return text;
      } catch (err) {
        const error = (err as Error).message;
        setState({ response: "", loading: false, error });
        return null;
      }
    },
    [apiKey, model]
  );

  const reset = useCallback(() => {
    setState({ response: "", loading: false, error: null });
  }, []);

  return { ...state, generate, reset };
}

// ── Standalone chat hook ──────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useGeminiChat({ apiKey, model = "gemini-2.5-flash" }: UseGeminiOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (userText: string, systemPrompt?: string) => {
      if (!apiKey) {
        setError("API key required");
        return;
      }

      const userMsg: ChatMessage = { role: "user", content: userText };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      try {
        const response = await callGemini(
          { apiKey, model },
          systemPrompt ?? "You are CodeMind, a helpful AI coding assistant.",
          userText
        );

        const assistantMsg: ChatMessage = { role: "assistant", content: response };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [apiKey, model]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, sendMessage, clearMessages };
}
