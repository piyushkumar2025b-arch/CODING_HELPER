// ─────────────────────────────────────────────
//  CodeMind — CodeEditor Component
// ─────────────────────────────────────────────
import React, { useRef, useCallback, KeyboardEvent } from "react";
import type { Language } from "../types";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  fontSize?: number;
  tabSize?: number;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  fontSize = 13,
  tabSize = 2,
  readOnly = false,
  placeholder = "// Write your code here…",
  className = "",
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = ref.current;
      if (!ta) return;

      // Tab → spaces
      if (e.key === "Tab") {
        e.preventDefault();
        const spaces = " ".repeat(tabSize);
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next =
          value.slice(0, start) + spaces + value.slice(end);
        onChange(next);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + tabSize;
        });
      }

      // Auto-pair brackets
      const pairs: Record<string, string> = {
        "(": ")",
        "[": "]",
        "{": "}",
        '"': '"',
        "'": "'",
        "`": "`",
      };
      if (pairs[e.key]) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        if (start !== end) {
          e.preventDefault();
          const selected = value.slice(start, end);
          const next =
            value.slice(0, start) +
            e.key +
            selected +
            pairs[e.key] +
            value.slice(end);
          onChange(next);
          requestAnimationFrame(() => {
            ta.selectionStart = start + 1;
            ta.selectionEnd = end + 1;
          });
        }
      }
    },
    [value, onChange, tabSize]
  );

  return (
    <textarea
      ref={ref}
      className={`code-editor-textarea ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      readOnly={readOnly}
      placeholder={placeholder}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      data-language={language}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize,
        tabSize,
        width: "100%",
        height: "100%",
        background: "var(--card)",
        border: "none",
        color: "#abb2bf",
        padding: "14px 16px",
        resize: "none",
        outline: "none",
        lineHeight: 1.75,
      }}
    />
  );
};

export default CodeEditor;
