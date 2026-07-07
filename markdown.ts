// ─────────────────────────────────────────────
//  CodeMind — Markdown → HTML renderer
// ─────────────────────────────────────────────

/** Lightweight markdown renderer (no dependencies) */
export function renderMarkdown(md: string): string {
  if (!md) return "";

  let html = md
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks  ```lang\n...\n```
  html = html.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    (_match, lang: string, code: string) => {
      const escapedCode = code.trim();
      const langLabel = lang || "code";
      return `<pre data-lang="${lang}"><button class="copy-btn" onclick="navigator.clipboard.writeText(this.nextSibling.textContent)">Copy</button><code class="language-${lang || "plaintext"} hljs">${escapedCode}</code></pre>`;
    }
  );

  // Headings
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold / Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists
  html = html.replace(/^[\*\-] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Horizontal rule
  html = html.replace(/^---+$/gm, "<hr/>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  // Paragraphs (double newlines)
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<(h[1-6]|ul|ol|pre|blockquote|hr)/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");

  return html;
}

/** Extract code blocks from markdown */
export function extractCodeBlocks(
  md: string
): Array<{ lang: string; code: string }> {
  const blocks: Array<{ lang: string; code: string }> = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(md)) !== null) {
    blocks.push({ lang: match[1] || "text", code: match[2].trim() });
  }
  return blocks;
}

/** Detect time and space complexity from AI response */
export function extractComplexity(text: string): {
  time?: string;
  space?: string;
} {
  const timeMatch = text.match(/time[:\s]+O\([^)]+\)/i);
  const spaceMatch = text.match(/space[:\s]+O\([^)]+\)/i);
  const genericMatch = [...text.matchAll(/O\([^)]+\)/gi)];

  return {
    time: timeMatch
      ? timeMatch[0].replace(/time[:\s]+/i, "").trim()
      : genericMatch[0]?.[0],
    space: spaceMatch
      ? spaceMatch[0].replace(/space[:\s]+/i, "").trim()
      : genericMatch[1]?.[0],
  };
}

/** Syntax-highlight a code string using highlight.js if available */
export function highlightCode(code: string, language: string): string {
  try {
    // @ts-ignore – hljs loaded via CDN
    if (typeof hljs !== "undefined") {
      // @ts-ignore
      return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    }
  } catch {
    // fallback to plain
  }
  return code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
