// ============================================================
// GEMINI API
// ============================================================
// Models that support system_instruction
const MODELS_WITH_SYSTEM = ['gemini-2.5-flash','gemini-2.5-pro','gemini-2.5-flash-lite-preview-06-17','gemini-2.0-flash','gemini-2.0-flash-lite','gemini-1.5-pro','gemini-1.5-flash'];

async function callGemini(systemPrompt, userPrompt, idx = 0) {
  if (idx >= GEMINI_MODELS.length) throw new Error('All Gemini models failed. Please check your API key is valid and has access to Gemini.');
  const model = GEMINI_MODELS[idx];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Older models don't support system_instruction — fold it into user message instead
  const supportsSystem = MODELS_WITH_SYSTEM.includes(model);
  const body = supportsSystem
    ? { system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 } }
    : { contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 } };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || '';

      // 401 = bad API key — don't bother retrying other models
      if (res.status === 401) throw new Error('Invalid API key (401). Please check your Gemini API key.');

      // 403 = key exists but no access to this model — try next
      if (res.status === 403) return callGemini(systemPrompt, userPrompt, idx + 1);

      // 429 = rate limited — try next model
      if (res.status === 429) return callGemini(systemPrompt, userPrompt, idx + 1);

      // 503 / 500 = server error — try next model
      if (res.status === 503 || res.status === 500) return callGemini(systemPrompt, userPrompt, idx + 1);

      // 404 = model not found — try next
      if (res.status === 404) return callGemini(systemPrompt, userPrompt, idx + 1);

      // 400 with system_instruction issue — retry without it (already handled above by supportsSystem check)
      if (res.status === 400 && errMsg.includes('system_instruction')) return callGemini(systemPrompt, userPrompt, idx + 1);

      // 400 with key issue — surface to user
      if (res.status === 400 && (errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('invalid')))
        throw new Error('Invalid API key: ' + errMsg);

      // Other 400 — try next model
      if (res.status === 400) return callGemini(systemPrompt, userPrompt, idx + 1);

      throw new Error(errMsg || 'HTTP ' + res.status);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      // Blocked or empty — try next model
      return callGemini(systemPrompt, userPrompt, idx + 1);
    }
    return { text, model };

  } catch(e) {
    // Network/CORS/fetch errors — try next model
    if (e.message.includes('fetch') || e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      return callGemini(systemPrompt, userPrompt, idx + 1);
    }
    throw e;
  }
}

// ============================================================
// PROMPT BUILDER
// ============================================================
function buildPrompt() {
  const question = document.getElementById('questionInput').value.trim();
  const code = document.getElementById('codeInput').value.trim() || document.getElementById('codeEditor').value.trim();
  const lang = currentLang === 'html' ? 'html/css/javascript' : currentLang;
  const platform = currentPlatform;
  const ansType = selectedAnswerType;

  const platformCtx = platform === 'leetcode' ? 'LeetCode competitive programming' :
                       platform === 'codeforces' ? 'Codeforces competitive programming' : 'general programming';

  const sys = `You are CodeMind, an elite ${platformCtx} assistant and expert in 16+ programming languages. You write clean, correct, well-commented code.
Rules:
- Always provide code in ${lang} unless asked otherwise
- Use fenced code blocks with language tag (\`\`\`${lang})
- For competitive programming always state Time and Space Complexity
- Be educational, explain your approach clearly`;

  const typeMap = {
    optimal: 'Provide the most optimal solution with best time/space complexity.',
    brute: 'First provide Brute Force labeled "Brute Force", then optionally show optimal.',
    both: 'Show Brute Force first with complexity, then Optimal with complexity. Compare them.',
    stepbystep: 'Give a detailed step-by-step breakdown of the algorithm before showing code.',
    hint: 'Give 2-3 progressive hints only. Do NOT give the full solution.'
  };

  let user = '';
  if (currentMode === 'solve') {
    if (!question) return null;
    user = `**Platform:** ${platform.toUpperCase()} | **Language:** ${lang} | **Type:** ${typeMap[ansType]}\n\n**Problem:**\n${question}${code ? `\n\n**My attempt:**\n\`\`\`${lang}\n${code}\n\`\`\`` : ''}`;
  } else if (currentMode === 'debug') {
    if (!code && !question) return null;
    user = `**Debug this ${lang} code.** Find ALL bugs, explain why each is wrong, show the fixed code.\n${question ? `Issue: ${question}\n` : ''}\`\`\`${lang}\n${code || question}\n\`\`\``;
  } else if (currentMode === 'explain') {
    if (!code && !question) return null;
    user = `**Explain this ${lang} code in detail.** What it does, how it works, algorithm used, time/space complexity.\n\`\`\`${lang}\n${code || question}\n\`\`\``;
  } else if (currentMode === 'optimize') {
    if (!code && !question) return null;
    user = `**Optimize this ${lang} code.** Show optimized version, explain what changed and why, compare complexities.\n${question ? `Goal: ${question}\n` : ''}\`\`\`${lang}\n${code || question}\n\`\`\``;
  } else if (currentMode === 'generate') {
    if (!question) return null;
    user = `**Generate ${lang} code for:** ${question}\nWrite clean, well-commented, production-ready code.`;
  } else if (currentMode === 'complexity') {
    if (!code && !question) return null;
    user = `**Analyze Big-O complexity of this ${lang} code.** Give Time Complexity, Space Complexity, best/avg/worst case, suggestions.\n\`\`\`${lang}\n${code || question}\n\`\`\``;
  } else if (currentMode === 'unittest') {
    if (!code && !question) return null;
    user = `**Generate comprehensive unit tests for this ${lang} code.**\nInclude: happy path, edge cases, error cases, boundary conditions.\nUse the most popular testing framework for ${lang} (Jest for JS/TS, pytest for Python, JUnit for Java, etc.).\nAdd brief comments explaining what each test covers.\n${question ? `Focus: ${question}\n` : ''}\`\`\`${lang}\n${code || question}\n\`\`\``;
  } else if (currentMode === 'review') {
    if (!code && !question) return null;
    user = `**Code Review for this ${lang} code.**\nProvide a structured review covering:\n1. **Score** (A/B/C/D) with justification\n2. **Bugs & Issues** (critical problems)\n3. **Code Quality** (readability, naming, structure)\n4. **Performance** (complexity, bottlenecks)\n5. **Security** (vulnerabilities if applicable)\n6. **Best Practices** (language-specific recommendations)\n7. **Refactored Version** (show improved code)\n${question ? `Context: ${question}\n` : ''}\`\`\`${lang}\n${code || question}\n\`\`\``;
  }

  return { system: sys, user };
}

// ============================================================
// AI RESPONSE RENDERING
// ============================================================
function renderMarkdown(text) {
  let codeBlockCount = 0;
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    codeBlockCount++;
    const idx = codeBlockCount;
    const hl = lang && hljs.getLanguage(lang)
      ? hljs.highlight(code.trim(), { language: lang }).value
      : hljs.highlightAuto(code.trim()).value;
    return `<pre>
      <button class="use-code-btn" onclick="useCode(${idx})">→ Use in Editor</button>
      <button class="copy-btn" onclick="copyPre(this)">Copy</button>
      <code class="hljs">${hl}</code>
    </pre>`;
  });
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  text = text.replace(/^#{1,3} (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  text = text.replace(/\n\n/g, '</p><p>');
  return '<p>' + text + '</p>';
}

// Store extracted code blocks for "Use in Editor"
let lastCodeBlocks = [];

function extractCodeBlocks(text) {
  lastCodeBlocks = [];
  const re = /```(\w*)\n?([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) lastCodeBlocks.push(m[2].trim());
}

function useCode(idx) {
  if (lastCodeBlocks[idx - 1]) {
    document.getElementById('codeEditor').value = lastCodeBlocks[idx - 1];
    switchTab('code');
  }
}

function copyPre(btn) {
  const code = btn.nextElementSibling.textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '✓'; setTimeout(() => btn.textContent = 'Copy', 1500);
  });
}

function extractComplexity(text) {
  const time = text.match(/[Tt]ime\s*[Cc]omplexity[^O]*O\(([^)]+)\)/)?.[1] || text.match(/O\(([^)]+)\)/)?.[1];
  const space = text.match(/[Ss]pace\s*[Cc]omplexity[^O]*O\(([^)]+)\)/)?.[1];
  return { time, space };
}

function getTag() {
  if (currentMode === 'debug') return '<span class="ai-tag tag-debug">🐛 DEBUG</span>';
  if (currentMode === 'explain') return '<span class="ai-tag tag-explain">📖 EXPLAIN</span>';
  if (currentMode === 'optimize') return '<span class="ai-tag tag-optimal">🚀 OPTIMIZE</span>';
  if (currentMode === 'generate') return '<span class="ai-tag tag-info">✨ GENERATE</span>';
  if (currentMode === 'complexity') return '<span class="ai-tag tag-info">📊 COMPLEXITY</span>';
  if (currentMode === 'unittest') return '<span class="ai-tag" style="background:rgba(16,185,129,.12);color:#6ee7b7;border:1px solid rgba(16,185,129,.3);">🧪 UNIT TESTS</span>';
  if (currentMode === 'review') return '<span class="ai-tag" style="background:rgba(59,130,246,.12);color:#93c5fd;border:1px solid rgba(59,130,246,.3);">🔍 CODE REVIEW</span>';
  if (selectedAnswerType === 'brute') return '<span class="ai-tag tag-brute">🪨 BRUTE FORCE</span>';
  if (selectedAnswerType === 'both') return '<span class="ai-tag tag-optimal">⚡ OPTIMAL + 🪨 BRUTE</span>';
  if (selectedAnswerType === 'hint') return '<span class="ai-tag tag-explain">💡 HINT</span>';
  return '<span class="ai-tag tag-optimal">⚡ OPTIMAL</span>';
}

// ============================================================
// MAIN ASK AI
// ============================================================
async function askAI() {
  if (!apiKey) { openModal('apiModal'); return; }
  if (isLoading) return;
  const prompts = buildPrompt();
  if (!prompts) { alert('Please enter a problem or code first!'); return; }

  isLoading = true;
  const btn = document.getElementById('askBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="thinking-dots"><span></span><span></span><span></span></span> Thinking...';
  switchTab('response');

  const panel = document.getElementById('responsePanel');
  panel.innerHTML = `<div class="thinking-anim"><span class="thinking-dots"><span></span><span></span><span></span></span> CodeMind is analyzing your problem...</div>`;

  try {
    const { text, model } = await callGemini(prompts.system, prompts.user);
    const { time, space } = extractComplexity(text);
    extractCodeBlocks(text);

    const complexityBadges = (time || space) ? `<div class="complexity-badges">
      ${time ? `<span class="badge badge-time">⏱ O(${time})</span>` : ''}
      ${space ? `<span class="badge badge-space">💾 O(${space})</span>` : ''}
    </div>` : '';

    panel.innerHTML = `<div class="ai-msg">
      <div class="ai-msg-header">
        ${getTag()}
        <span style="font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace;">${model} · ${LANG_LABELS[currentLang]||currentLang}</span>
        ${complexityBadges}
      </div>
      <div class="ai-content">${renderMarkdown(text)}</div>
    </div>`;

    // Auto-populate first code block into editor
    if (lastCodeBlocks.length > 0) {
      document.getElementById('codeEditor').value = lastCodeBlocks[0];
    }
  } catch(e) {
    const isKeyErr = e.message.toLowerCase().includes('key') || e.message.includes('401');
    panel.innerHTML = `<div class="ai-msg">
      <div class="ai-content">
        <p style="color:var(--danger)">❌ ${e.message}</p>
        ${isKeyErr ? `<p style="color:var(--warn);margin-top:6px">👉 Click the <strong>Gemini Connected / No API Key</strong> badge in the header to update your key.</p>` : ''}
        <p style="color:var(--muted);margin-top:6px;font-size:12px">Get a free Gemini API key at <strong>aistudio.google.com</strong></p>
      </div>
    </div>`;
  } finally {
    isLoading = false;
    btn.disabled = false;
    btn.innerHTML = '<span>⚡</span> Ask CodeMind';
  }
}

// ============================================================
// DEBUG CURRENT CODE
// ============================================================
async function debugCurrentCode() {
  const code = document.getElementById('codeEditor').value.trim();
  if (!code) { alert('No code in editor to debug!'); return; }
  document.getElementById('codeInput').value = code;
  setMode('debug');
  await askAI();
}

