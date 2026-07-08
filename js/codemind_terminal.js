// CodeMind Code Terminal - Live Compiler with Multi-Language Support
// Uses free APIs: Piston → Wandbox → Public Judge0 → Gemini AI → RapidAPI Judge0

const TERMINAL_LANGUAGES = [
  { name: 'JavaScript', id: 'javascript', icon: '⚡', piston: 'javascript', judge0: 63, wandbox: 'nodejs-head' },
  { name: 'JavaScript Console (REPL)', id: 'js_repl', icon: '💻', piston: null, judge0: null, wandbox: null },
  { name: 'Python', id: 'python', icon: '🐍', piston: 'python', judge0: 71, wandbox: 'cpython-3.12.0' },
  { name: 'Java', id: 'java', icon: '☕', piston: 'java', judge0: 62, wandbox: 'openjdk-head' },
  { name: 'C++', id: 'cpp', icon: '⚙️', piston: 'cpp', judge0: 54, wandbox: 'gcc-head' },
  { name: 'C', id: 'c', icon: 'Ⓒ', piston: 'c', judge0: 50, wandbox: 'gcc-head' },
  { name: 'C#', id: 'csharp', icon: '#️⃣', piston: 'csharp', judge0: 51, wandbox: 'csharp' },
  { name: 'Go', id: 'go', icon: '🐹', piston: 'go', judge0: 60, wandbox: 'go-head' },
  { name: 'Rust', id: 'rust', icon: '🦀', piston: 'rust', judge0: 73, wandbox: 'rust-head' },
  { name: 'Ruby', id: 'ruby', icon: '💎', piston: 'ruby', judge0: 72, wandbox: 'ruby-head' },
  { name: 'PHP', id: 'php', icon: '🐘', piston: 'php', judge0: 68, wandbox: 'php-head' },
  { name: 'TypeScript', id: 'typescript', icon: '📘', piston: 'typescript', judge0: 74, wandbox: 'typescript-4.9.5' },
  { name: 'Kotlin', id: 'kotlin', icon: '🎯', piston: 'kotlin', judge0: 78, wandbox: null },
  { name: 'Swift', id: 'swift', icon: '🍎', piston: 'swift', judge0: 83, wandbox: 'swift-head' },
  { name: 'R', id: 'r', icon: 'Ⓡ', piston: 'r', judge0: 80, wandbox: null },
  { name: 'SQL', id: 'sql', icon: '🗃️', piston: 'sql', judge0: 82, wandbox: null },
  { name: 'Bash', id: 'bash', icon: '🔧', piston: 'bash', judge0: 46, wandbox: 'bash' },
  { name: 'Shell', id: 'shell', icon: '🖥️', piston: 'shell', judge0: 46, wandbox: 'bash' },
  { name: 'Perl', id: 'perl', icon: '🐪', piston: 'perl', judge0: 65, wandbox: 'perl-head' },
  { name: 'Scala', id: 'scala', icon: '📊', piston: 'scala', judge0: 81, wandbox: 'scala-head' },
  { name: 'Haskell', id: 'haskell', icon: 'λ', piston: 'haskell', judge0: 61, wandbox: 'ghc-head' },
];

const PISTON_API = 'https://emkc.org/api/v2/piston';
const JUDGE0_API = 'https://judge0-ce.p.rapidapi.com';
const WANDBOX_API = 'https://wandbox.org/api';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// VS Code Panel Tab State
let activeVscTab = 'terminal'; // terminal, problems, output, debug

// Multi-Terminal instance state
let activeTerminals = [];
let currentTerminalId = 1;
let terminalProblems = []; // stores errors for Problems panel

let terminalState = {
  theme: 'material-darker',
  isFullscreen: false,
  isMaximized: false,
};

function initTerminal() {
  loadTerminalsFromStorage();
  renderTerminalLanguages();
  attachTerminalEvents();
  setupCodeMirrorListeners();
  updateTabsSidebar();
  restoreActiveTerminal();
}

function loadTerminalsFromStorage() {
  try {
    const saved = localStorage.getItem('cm_active_terminals');
    if (saved) {
      activeTerminals = JSON.parse(saved);
      const savedActiveId = localStorage.getItem('cm_current_terminal_id');
      if (savedActiveId) currentTerminalId = parseInt(savedActiveId);
    }
  } catch (e) {
    console.error('Failed to load terminals from storage:', e);
  }

  // Seed default if empty
  if (!activeTerminals || activeTerminals.length === 0) {
    activeTerminals = [
      {
        id: 1,
        name: 'node (JS)',
        lang: 'javascript',
        code: '// Welcome to Code Terminal\nconsole.log("Hello, World!");',
        input: '',
        output: '<div class="terminal-msg muted">Output will appear here...</div>',
        meta: '',
        status: 'idle'
      }
    ];
    currentTerminalId = 1;
  }
}

function saveTerminalsToStorage() {
  localStorage.setItem('cm_active_terminals', JSON.stringify(activeTerminals));
  localStorage.setItem('cm_current_terminal_id', currentTerminalId.toString());
}

function renderTerminalLanguages() {
  const selector = document.getElementById('terminalLangSelector');
  if (!selector) return;

  selector.innerHTML = '';
  TERMINAL_LANGUAGES.forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang.id;
    opt.textContent = `${lang.icon} ${lang.name}`;
    selector.appendChild(opt);
  });
}

function attachTerminalEvents() {
  // Input sync
  const stdinInput = document.getElementById('terminalStdin');
  if (stdinInput) {
    stdinInput.oninput = (e) => {
      const term = activeTerminals.find(t => t.id === currentTerminalId);
      if (term) {
        term.input = e.target.value;
        saveTerminalsToStorage();
      }
    };
  }
}

function setupCodeMirrorListeners() {
  if (window.terminalEditor) {
    window.terminalEditor.on('cursorActivity', () => {
      const info = window.terminalEditor.getCursor();
      const statusCursor = document.getElementById('vscStatusCursor');
      if (statusCursor) {
        statusCursor.textContent = `Ln ${info.line + 1}, Col ${info.ch + 1}`;
      }
    });

    window.terminalEditor.on('change', () => {
      const term = activeTerminals.find(t => t.id === currentTerminalId);
      if (term) {
        term.code = window.terminalEditor.getValue();
        saveTerminalsToStorage();
      }
    });
  }
}

// Sidebar list management
function updateTabsSidebar() {
  const container = document.getElementById('terminalListContainer');
  if (!container) return;

  container.innerHTML = '';
  activeTerminals.forEach((term, index) => {
    const item = document.createElement('div');
    item.className = `vsc-term-item ${term.id === currentTerminalId ? 'active' : ''}`;
    item.onclick = () => switchTerminalInstance(term.id);

    const langObj = TERMINAL_LANGUAGES.find(l => l.id === term.lang) || { icon: '💻', name: 'Shell' };
    
    // Status dot color mapping
    let statusClass = 'idle';
    if (term.status === 'running') statusClass = 'running';
    else if (term.status === 'success') statusClass = 'success';
    else if (term.status === 'error') statusClass = 'error';

    item.innerHTML = `
      <span class="vsc-term-icon">${langObj.icon}</span>
      <span class="vsc-term-name">${index + 1}: ${term.name}</span>
      <span class="vsc-term-status ${statusClass}"></span>
      <button class="vsc-term-close" onclick="event.stopPropagation(); closeTerminalInstance(${term.id})">✕</button>
    `;
    container.appendChild(item);
  });
}

function restoreActiveTerminal() {
  const term = activeTerminals.find(t => t.id === currentTerminalId);
  if (!term) return;

  // Set editor
  if (window.terminalEditor) {
    window.terminalEditor.setValue(term.code || '');
    const langObj = TERMINAL_LANGUAGES.find(l => l.id === term.lang);
    if (langObj) {
      window.terminalEditor.setOption('mode', getCodeMirrorMode(langObj.name));
    }
  }

  // Set selector
  const selector = document.getElementById('terminalLangSelector');
  if (selector) selector.value = term.lang;

  // Set input
  const stdinInput = document.getElementById('terminalStdin');
  if (stdinInput) stdinInput.value = term.input || '';

  // Set output
  const outputBox = document.getElementById('terminalOutput');
  if (outputBox) {
    if (term.lang === 'js_repl') {
      renderReplLayout(outputBox, term);
    } else {
      outputBox.innerHTML = term.output || '<div class="terminal-msg muted">Output will appear here...</div>';
    }
  }

  // Set output meta
  const metaBox = document.getElementById('terminalOutputMeta');
  if (metaBox) metaBox.innerHTML = term.meta || '';

  // Update status bar
  updateStatusBar();
}

function switchTerminalInstance(id) {
  // Save current active editor code first to prevent loss
  const term = activeTerminals.find(t => t.id === currentTerminalId);
  if (term && window.terminalEditor) {
    term.code = window.terminalEditor.getValue();
  }

  currentTerminalId = id;
  saveTerminalsToStorage();
  updateTabsSidebar();
  restoreActiveTerminal();
}

function addNewTerminalInstance() {
  // Find highest ID
  const maxId = activeTerminals.reduce((max, t) => t.id > max ? t.id : max, 0);
  const newId = maxId + 1;

  // Set default templates
  const templates = {
    javascript: '// JavaScript\nconsole.log("Hello, World!");',
    js_repl: '// JavaScript Interactive Console\n// Type expressions on the right and press Enter\n',
    python: '# Python\nprint("Hello, World!")',
    cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
  };

  const currentGlobalLang = activeTerminals.find(t => t.id === currentTerminalId)?.lang || 'javascript';
  const newLang = currentGlobalLang;
  const langObj = TERMINAL_LANGUAGES.find(l => l.id === newLang) || { name: 'Shell' };

  const newTerm = {
    id: newId,
    name: `${langObj.name.split(' ')[0]}`,
    lang: newLang,
    code: templates[newLang] || '// Write code here...',
    input: '',
    output: '<div class="terminal-msg muted">Output will appear here...</div>',
    meta: '',
    status: 'idle'
  };

  activeTerminals.push(newTerm);
  currentTerminalId = newId;

  saveTerminalsToStorage();
  updateTabsSidebar();
  restoreActiveTerminal();
}

function closeTerminalInstance(id) {
  if (activeTerminals.length <= 1) {
    alert('Cannot close the last terminal.');
    return;
  }

  const index = activeTerminals.findIndex(t => t.id === id);
  if (index === -1) return;

  activeTerminals.splice(index, 1);

  if (currentTerminalId === id) {
    // Switch to first remaining
    currentTerminalId = activeTerminals[0].id;
  }

  saveTerminalsToStorage();
  updateTabsSidebar();
  restoreActiveTerminal();
}

function changeTerminalLanguage(langId) {
  const term = activeTerminals.find(t => t.id === currentTerminalId);
  if (!term) return;

  term.lang = langId;
  const lang = TERMINAL_LANGUAGES.find(l => l.id === langId);
  term.name = `${lang.name.split(' ')[0]}`;

  if (window.terminalEditor) {
    window.terminalEditor.setOption('mode', getCodeMirrorMode(lang.name));
  }

  // Load language templates
  const templates = {
    javascript: '// JavaScript\nconsole.log("Hello, World!");',
    js_repl: '// JavaScript Interactive Console\n// Type expressions below and press Enter\n',
    python: '# Python\nprint("Hello, World!")',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
    c: '#include <stdio.h>\nint main() {\n    printf("Hello, World!");\n    return 0;\n}',
    csharp: 'using System;\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}',
    rust: 'fn main() {\n    println!("Hello, World!");\n}',
    go: 'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
    ruby: 'puts "Hello, World!"',
    php: '<?php\necho "Hello, World!";\n?>',
  };

  if (templates[langId] && window.terminalEditor) {
    window.terminalEditor.setValue(templates[langId]);
    term.code = templates[langId];
  }

  saveTerminalsToStorage();
  updateTabsSidebar();
  restoreActiveTerminal();
}

// Status bar renderer
function updateStatusBar() {
  const term = activeTerminals.find(t => t.id === currentTerminalId);
  if (!term) return;

  const langObj = TERMINAL_LANGUAGES.find(l => l.id === term.lang);
  
  const statusRunning = document.getElementById('vscStatusRunning');
  if (statusRunning) {
    statusRunning.textContent = term.status.toUpperCase();
    statusRunning.style.color = term.status === 'running' ? '#00e5ff' : (term.status === 'error' ? '#fca5a5' : '#6ee7b7');
  }

  const statusLang = document.getElementById('vscStatusLang');
  if (statusLang) {
    statusLang.textContent = langObj ? langObj.name : 'Unknown';
  }

  const statusEngine = document.getElementById('vscStatusEngine');
  if (statusEngine) {
    if (term.lang === 'js_repl') {
      statusEngine.textContent = 'Engine: Local Browser';
    } else {
      statusEngine.textContent = 'Engine: Piston / Gemini / Wandbox';
    }
  }
}

// Theme Change Handler
function changeTerminalTheme(themeName) {
  terminalState.theme = themeName;
  if (window.terminalEditor) {
    window.terminalEditor.setOption('theme', themeName);
  }
}

function getCurrentTerminal() {
  return activeTerminals.find(t => t.id === currentTerminalId) || null;
}

function getTerminalCode() {
  const term = getCurrentTerminal();
  if (!term) return '';
  return window.terminalEditor ? window.terminalEditor.getValue() : (term.code || '');
}

function getTerminalOutputText() {
  const term = getCurrentTerminal();
  if (!term) return '';

  if (term.lang === 'js_repl') {
    const history = document.getElementById('replHistory');
    return history ? history.innerText.trim() : '';
  }

  const outputBox = document.getElementById('terminalOutput');
  return outputBox ? outputBox.innerText.trim() : '';
}

function getTerminalFilename(langId) {
  const lang = TERMINAL_LANGUAGES.find(l => l.id === langId) || { name: 'code', id: 'txt' };
  const safeName = (lang.name || 'code').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'code';
  const extMap = {
    javascript: 'js',
    js_repl: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    csharp: 'cs',
    go: 'go',
    rust: 'rs',
    ruby: 'rb',
    php: 'php',
    kotlin: 'kt',
    swift: 'swift',
    r: 'r',
    sql: 'sql',
    bash: 'sh',
    shell: 'sh',
    perl: 'pl',
    scala: 'scala',
    haskell: 'hs',
  };
  return `${safeName}.${extMap[langId] || 'txt'}`;
}

function copyTextToClipboard(text, successMessage) {
  if (!text) {
    showNotification('⚠️ Nothing to copy', 'warn');
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    showNotification(successMessage, 'ok');
  }).catch(() => {
    showNotification('❌ Clipboard copy failed', 'err');
  });
}

function copyTerminalCode() {
  copyTextToClipboard(getTerminalCode(), '✅ Code copied');
}

function copyTerminalOutput() {
  copyTextToClipboard(getTerminalOutputText(), '✅ Output copied');
}

function downloadTerminalCode() {
  const term = getCurrentTerminal();
  if (!term) return;

  const code = getTerminalCode();
  if (!code.trim()) {
    showNotification('⚠️ No code to download', 'warn');
    return;
  }

  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getTerminalFilename(term.lang);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showNotification('✅ Download started', 'ok');
}

async function formatTerminalCode() {
  const term = getCurrentTerminal();
  if (!term) return;

  const code = getTerminalCode();
  if (!code.trim()) {
    showNotification('⚠️ No code to format', 'warn');
    return;
  }

  const parserMap = { javascript: 'babel', typescript: 'typescript', html: 'html', css: 'css', json: 'json' };
  const parser = parserMap[term.lang];
  if (!parser || typeof prettier === 'undefined') {
    showNotification(`⚠️ Formatting is not available for ${term.name}`, 'warn');
    return;
  }

  const plugins = [window.prettierPlugins?.babel, window.prettierPlugins?.html, window.prettierPlugins?.typescript, window.prettierPlugins?.postcss].filter(Boolean);
  try {
    const formatted = await prettier.format(code, {
      parser,
      plugins,
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      printWidth: 100,
    });

    if (window.terminalEditor) {
      window.terminalEditor.setValue(formatted);
    } else {
      term.code = formatted;
    }
    term.code = formatted;
    saveTerminalsToStorage();
    showNotification('✅ Code formatted', 'ok');
  } catch (e) {
    showNotification('❌ Format error: ' + e.message.split('\n')[0], 'err');
  }
}

// Split pane visual toggle
function splitTerminalPane() {
  const splitContainer = document.querySelector('.terminal-split');
  if (!splitContainer) return;

  const isVertical = splitContainer.style.flexDirection === 'column';
  splitContainer.style.flexDirection = isVertical ? 'row' : 'column';
  
  const resizer = document.getElementById('terminalResizer');
  if (resizer) {
    resizer.style.width = isVertical ? '4px' : '100%';
    resizer.style.height = isVertical ? 'auto' : '4px';
    resizer.style.cursor = isVertical ? 'col-resize' : 'row-resize';
  }
}

// Maximize toggle
function toggleTerminalMaximize() {
  const container = document.getElementById('terminalContainer');
  if (!container) return;

  terminalState.isMaximized = !terminalState.isMaximized;
  if (terminalState.isMaximized) {
    container.classList.add('maximized');
    document.getElementById('terminalMaxBtn').textContent = '🗗 Restore';
  } else {
    container.classList.remove('maximized');
    document.getElementById('terminalMaxBtn').textContent = '🗖 Maximize';
  }
}

// Fullscreen toggle
function toggleTerminalFullscreen() {
  const container = document.getElementById('terminalContainer');
  if (!container) return;

  terminalState.isFullscreen = !terminalState.isFullscreen;
  if (terminalState.isFullscreen) {
    container.classList.add('fullscreen');
    document.getElementById('terminalFullscreenBtn').textContent = '⛔ Exit Fullscreen';
  } else {
    container.classList.remove('fullscreen');
    document.getElementById('terminalFullscreenBtn').textContent = '🔲 Fullscreen';
  }
}

// Switch VS Code Panel Tab
function switchVscPanelTab(tabName) {
  activeVscTab = tabName;
  
  // Highlight tab
  const tabs = document.querySelectorAll('.vsc-tabs-left .vsc-tab');
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.textContent.toLowerCase().includes(tabName));
  });

  const workspace = document.getElementById('terminalWorkspace');
  const outputCol = document.querySelector('.terminal-output-col');
  const editorCol = document.querySelector('.terminal-editor-col');
  const resizer = document.getElementById('terminalResizer');

  if (tabName === 'problems') {
    // Show Problems list in output column and hide editor
    editorCol.style.display = 'none';
    resizer.style.display = 'none';
    outputCol.style.flex = '1';
    renderProblemsList();
  } else if (tabName === 'output' || tabName === 'debug') {
    editorCol.style.display = 'none';
    resizer.style.display = 'none';
    outputCol.style.flex = '1';
    
    const outputBox = document.getElementById('terminalOutput');
    if (tabName === 'output') {
      outputBox.innerHTML = `<div style="color:#858585;font-size:11px">[System Logs] Initialized execution channels...</div>`;
    } else {
      outputBox.innerHTML = `<div style="color:#858585;font-size:11px">[Debug Console] REPL environment ready. Switch active language to REPL JS for line inputs.</div>`;
    }
  } else {
    // Restore default terminal split view
    editorCol.style.display = 'flex';
    resizer.style.display = 'block';
    outputCol.style.flex = '1';
    restoreActiveTerminal();
  }
}

function renderProblemsList() {
  const outputBox = document.getElementById('terminalOutput');
  if (!outputBox) return;

  if (terminalProblems.length === 0) {
    outputBox.innerHTML = `
      <div style="padding:16px;color:var(--vsc-text-muted);font-size:11px;">
        ✓ No problems have been detected in the workspace.
      </div>
    `;
    return;
  }

  let html = `<div style="padding:8px;font-size:11px;">`;
  terminalProblems.forEach(p => {
    html += `
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;padding:6px;border-bottom:1px solid #2d2d2d">
        <span style="color:#ef4444;font-weight:bold">[Error]</span>
        <div style="flex:1">
          <div style="color:#fca5a5;font-weight:700;">${escapeHtml(p.title || 'Compile/Runtime Error')}</div>
          <pre style="margin:4px 0;background:#18181f;padding:6px;border-radius:4px;color:#fca5a5">${escapeHtml(p.details)}</pre>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  outputBox.innerHTML = html;
}

// ---- INTERACTIVE REPL WORKSPACE ----
function renderReplLayout(outputBox, term) {
  // If we don't have interactive container, inject
  outputBox.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;gap:10px;">
      <div id="replHistory" style="flex:1;overflow-y:auto;max-height:80%;">
        ${term.output || '<div style="color:#858585;font-size:11px;">JavaScript REPL Sandbox. Type code below and hit Enter...</div>'}
      </div>
      <div class="repl-input-row">
        <span class="repl-prompt">&gt;</span>
        <textarea id="replPromptInput" class="repl-input" placeholder="Type JS code and press Enter..." rows="1"></textarea>
      </div>
    </div>
  `;

  const replInput = document.getElementById('replPromptInput');
  if (replInput) {
    replInput.focus();
    replInput.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        evaluateReplCode();
      }
    };
  }
}

function evaluateReplCode() {
  const replInput = document.getElementById('replPromptInput');
  if (!replInput) return;

  const expression = replInput.value.trim();
  if (!expression) return;

  replInput.value = '';

  const history = document.getElementById('replHistory');
  const term = activeTerminals.find(t => t.id === currentTerminalId);

  // Evaluate
  let result;
  let isErr = false;
  try {
    // Evaluate in a simplified sandboxed function context
    const fn = new Function(`return (${expression})`);
    result = fn();
    if (result === undefined) result = 'undefined';
    else if (result === null) result = 'null';
    else if (typeof result === 'object') result = JSON.stringify(result, null, 2);
  } catch (e) {
    result = e.message;
    isErr = true;
  }

  // Append logs
  const logItem = document.createElement('div');
  logItem.className = 'repl-item';
  logItem.innerHTML = `
    <div class="repl-item-code">&gt; ${escapeHtml(expression)}</div>
    <div class="${isErr ? 'repl-item-err' : 'repl-item-out'}">${escapeHtml(result)}</div>
  `;
  history.appendChild(logItem);
  history.scrollTop = history.scrollHeight;

  // Save state
  term.output = history.innerHTML;
  saveTerminalsToStorage();
}


// ---- RUN CODE EXECUTOR ----
async function runTerminalCode() {
  const term = activeTerminals.find(t => t.id === currentTerminalId);
  if (!term) return;

  // Read code
  const code = window.terminalEditor ? window.terminalEditor.getValue() : term.code;
  const input = document.getElementById('terminalStdin')?.value || '';
  const outputBox = document.getElementById('terminalOutput');

  if (term.lang === 'js_repl') {
    evaluateReplCode();
    return;
  }

  if (!code.trim()) {
    outputBox.innerHTML = '<div class="terminal-msg warn">⚠️ No code to run</div>';
    return;
  }

  const runBtn = document.getElementById('terminalRunBtn');
  runBtn.disabled = true;
  runBtn.textContent = '⏳ Run...';
  
  outputBox.innerHTML = '<div class="terminal-msg info">🔄 Executing compiler pipeline...</div>';
  term.status = 'running';
  updateTabsSidebar();
  updateStatusBar();

  try {
    const result = await executeCode(code, input);
    
    if (result.success) {
      const output = result.output || '(no output)';
      const via = result.via ? `<span style="color:#00e5ff;font-size:11px"> · via ${result.via}</span>` : '';
      const htmlOutput = `<div class="output-success">
        <div class="output-time">⏱️ ${result.time || '0'}s${via}</div>
        <pre>${escapeHtml(output)}</pre>
      </div>`;
      outputBox.innerHTML = htmlOutput;
      term.output = htmlOutput;
      term.status = 'success';
      term.meta = `⏱️ ${result.time || '0'}s`;
    } else {
      const err = result.error || result.message || 'Unknown error';
      const needsGeminiKey = err.includes('No Gemini key') || err.includes('cm_gemini_key');
      const htmlErr = `<div class="output-error">
        <div class="error-title">❌ Execution Failed</div>
        <pre>${escapeHtml(err)}</pre>
        ${needsGeminiKey ? `
        <div style="margin-top:12px;padding:12px;background:#0a0a0f;border:1px solid #00e5ff33;border-radius:8px">
          <div style="color:#00e5ff;font-size:12px;font-weight:700;margin-bottom:8px">🔑 Add Gemini API Key to unlock AI-powered execution</div>
          <div style="display:flex;gap:8px">
            <input id="terminalGeminiKeyInput" type="password" placeholder="Paste your Gemini API key here (AIza...)" 
              style="flex:1;background:#18181f;border:1px solid #2a2a3a;border-radius:6px;color:#e8e8f0;font-size:11px;padding:6px 10px;font-family:monospace;outline:none"/>
            <button onclick="saveTerminalGeminiKey()" 
              style="background:rgba(0,229,255,.15);border:1px solid #00e5ff;color:#00e5ff;border-radius:6px;font-size:11px;font-weight:700;padding:6px 12px;cursor:pointer">Save & Retry</button>
          </div>
          <div style="color:#6b6b80;font-size:10px;margin-top:6px">Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#00e5ff">aistudio.google.com</a></div>
        </div>` : ''}
      </div>`;
      outputBox.innerHTML = htmlErr;
      term.output = htmlErr;
      term.status = 'error';
      term.meta = 'Exit Error';

      // Log to problems pane
      terminalProblems.push({
        title: `Tab ${activeTerminals.findIndex(t => t.id === term.id) + 1}: ${term.name} Run Error`,
        details: err
      });
      document.getElementById('vscProblemsCount').textContent = terminalProblems.length.toString();
    }
  } catch (err) {
    const htmlErr = `<div class="terminal-msg error">⚠️ ${err.message}</div>`;
    outputBox.innerHTML = htmlErr;
    term.output = htmlErr;
    term.status = 'error';
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '▶ Run';
    saveTerminalsToStorage();
    updateTabsSidebar();
    updateStatusBar();
  }
}

async function executeCode(code, input) {
  const lang = TERMINAL_LANGUAGES.find(l => l.id === activeTerminals.find(t => t.id === currentTerminalId).lang);
  const errors = [];

  // 1️⃣ Piston API (free, no key)
  try {
    const result = await executePiston(code, input, lang);
    if (result.success || result.error) return result;
  } catch (err) {
    console.warn('Piston failed:', err.message);
    errors.push('Piston: ' + err.message);
  }

  // 2️⃣ Wandbox (free, no key, supports 20+ languages)
  try {
    const result = await executeWandbox(code, input, lang);
    if (result.success || result.error) return result;
  } catch (err) {
    console.warn('Wandbox failed:', err.message);
    errors.push('Wandbox: ' + err.message);
  }

  // 3️⃣ Public Judge0 CE (free, no key)
  try {
    const result = await executePublicJudge0(code, input, lang);
    if (result.success || result.error) return result;
  } catch (err) {
    console.warn('Public Judge0 failed:', err.message);
    errors.push('Judge0 Public: ' + err.message);
  }

  // 4️⃣ Gemini AI code execution (uses saved Gemini key)
  try {
    const result = await executeViaGemini(code, lang);
    if (result.success || result.error) return result;
  } catch (err) {
    console.warn('Gemini execution failed:', err.message);
    errors.push('Gemini: ' + err.message);
  }

  // 5️⃣ RapidAPI Judge0 (needs key)
  try {
    return await executeJudge0(code, input, lang);
  } catch (err) {
    errors.push('Judge0 RapidAPI: ' + err.message);
    return {
      success: false,
      error: `❌ All execution engines failed.\n\nTried:\n• ${errors.join('\n• ')}\n\n💡 Tip: Free APIs sometimes have brief outages. Try again in a few seconds!`,
    };
  }
}

async function executePiston(code, input, lang) {
  const response = await fetch(`${PISTON_API}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: lang.piston,
      version: '*',
      files: [{ name: 'main', content: code }],
      stdin: input,
    }),
  });

  if (!response.ok) throw new Error(`Piston API error: ${response.status}`);

  const data = await response.json();

  if (data.run.signal) {
    return {
      success: false,
      error: `Signal: ${data.run.signal}\n${data.run.stderr || data.run.stdout}`,
    };
  }

  return {
    success: !data.run.stderr,
    output: data.run.stdout || data.run.stderr,
    error: data.run.stderr,
    time: data.run.wall ? (parseFloat(data.run.wall) / 1000).toFixed(2) : '0',
  };
}

// ---- Wandbox (free, no key, wandbox.org) ----
async function executeWandbox(code, input, lang) {
  if (!lang.wandbox) throw new Error(`${lang.name} not supported by Wandbox`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const resp = await fetch(`${WANDBOX_API}/compile.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compiler: lang.wandbox,
        code: code,
        stdin: input || '',
        'compiler-option-raw': '',
        'runtime-option-raw': '',
        save: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`Wandbox HTTP ${resp.status}`);

    const data = await resp.json();
    const output = data.program_output || data.program_error || '';
    const compileErr = data.compiler_error || '';
    const isSuccess = data.status === '0' || data.status === 0;

    if (compileErr && !output) {
      return { success: false, output: compileErr, error: compileErr, time: '0' };
    }
    return {
      success: isSuccess,
      output: output || compileErr || '(no output)',
      error: data.program_error || compileErr || '',
      time: '0',
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Wandbox timed out (15s)');
    throw err;
  }
}

// ---- Free public Judge0 CE (no RapidAPI key required) ----
async function executePublicJudge0(code, input, lang) {
  const PUBLIC_URL = 'https://api.judge0.com';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const submitResp = await fetch(`${PUBLIC_URL}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: code,
        language_id: lang.judge0,
        stdin: input || '',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!submitResp.ok) throw new Error(`HTTP ${submitResp.status}`);

    const data = await submitResp.json();
    if (!data.status) throw new Error('Invalid response from public Judge0');

    const isSuccess = data.status.id === 3;
    const output = data.stdout || '';
    const errOut = data.stderr || data.compile_output || '';

    return {
      success: isSuccess || (!errOut && !!output),
      output: output || errOut,
      error: errOut,
      time: data.time ? parseFloat(data.time).toFixed(2) : '0',
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Public Judge0 timed out (12s)');
    throw err;
  }
}

// ---- Gemini AI Code Execution (uses saved Gemini key) ----
async function executeViaGemini(code, lang) {
  // Try multiple sources for the Gemini key
  const key = localStorage.getItem('cm_gemini_key')
    || (typeof window.apiKey !== 'undefined' ? window.apiKey : '')
    || '';
  if (!key) throw new Error('No Gemini key saved');

  const prompt = `Execute this ${lang.name} code and return ONLY the exact program output (stdout), nothing else. If there is a compile or runtime error, return only the error message. Do not explain, do not add markdown, just return the raw output.

Code:
\`\`\`${lang.id}\n${code}\n\`\`\``;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const resp = await fetch(
      `${GEMINI_API_BASE}/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 2048 },
          tools: [{ codeExecution: {} }],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      throw new Error(e?.error?.message || `Gemini HTTP ${resp.status}`);
    }

    const data = await resp.json();
    // Extract code execution output or text output
    let output = '';
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.executableCode) continue; // skip the code echo
      if (part.codeExecutionResult) {
        output = part.codeExecutionResult.output || '';
        break;
      }
      if (part.text) output = part.text.trim();
    }

    if (!output) throw new Error('Gemini returned no output');

    // Remove markdown code fences if Gemini wrapped it
    output = output.replace(/^```[\w]*\n?/m, '').replace(/\n?```$/m, '').trim();

    return { success: true, output, error: '', time: '0', via: 'Gemini AI ✨' };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Gemini timed out (20s)');
    throw err;
  }
}

async function executeJudge0(code, input, lang) {
  const key = localStorage.getItem('cm_j0_key');
  if (!key) {
    throw new Error('Judge0 requires an API key. Get one free at rapidapi.com');
  }

  // First submission
  const submitResp = await fetch(`${JUDGE0_API}/submissions?base64_encoded=false&wait=false`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      'X-RapidAPI-Key': key,
    },
    body: JSON.stringify({
      source_code: code,
      language_id: lang.judge0,
      stdin: input,
    }),
  });

  if (!submitResp.ok) {
    throw new Error(`Judge0 submission failed: ${submitResp.status}`);
  }

  const { token } = await submitResp.json();

  // Poll for result
  let resultData = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));

    const getResp = await fetch(`${JUDGE0_API}/submissions/${token}?base64_encoded=false`, {
      headers: {
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        'X-RapidAPI-Key': key,
      },
    });

    if (!getResp.ok) continue;

    resultData = await getResp.json();
    if (resultData.status.id > 2) break; // Status > 2 means completed
  }

  if (!resultData) throw new Error('Judge0 timeout');

  const isSuccess = resultData.status.id === 3; // Accepted
  return {
    success: isSuccess,
    output: resultData.stdout || '',
    error: resultData.stderr || resultData.compile_output || '',
    time: (resultData.time || 0).toFixed(2),
  };
}

function clearTerminal() {
  const term = activeTerminals.find(t => t.id === currentTerminalId);
  if (!term) return;

  if (term.lang === 'js_repl') {
    term.output = '<div style="color:#858585;font-size:11px;">JavaScript REPL Sandbox. Type code below and hit Enter...</div>';
    restoreActiveTerminal();
  } else {
    if (window.terminalEditor) {
      window.terminalEditor.setValue('');
    }
    document.getElementById('terminalStdin').value = '';
    document.getElementById('terminalOutput').innerHTML = '<div class="terminal-msg muted">Output will appear here...</div>';
    term.code = '';
    term.output = '';
  }
  
  saveTerminalsToStorage();
}

function loadTerminalCode() {
  // Overridden by restoreActiveTerminal and multi-tab logic
}

function saveTerminalCode() {
  const term = activeTerminals.find(t => t.id === currentTerminalId);
  if (term && window.terminalEditor) {
    term.code = window.terminalEditor.getValue();
    saveTerminalsToStorage();
  }
}

function getCodeMirrorMode(langName) {
  const modeMap = {
    JavaScript: 'javascript',
    'JavaScript Console (REPL)': 'javascript',
    Python: 'python',
    Java: 'text/x-java',
    'C++': 'text/x-c++src',
    C: 'text/x-csrc',
    'C#': 'text/x-csharp',
    Go: 'text/x-go',
    Rust: 'text/x-rustsrc',
    Ruby: 'text/x-ruby',
    PHP: 'application/x-httpd-php',
    TypeScript: 'application/typescript',
  };
  return modeMap[langName] || 'text/plain';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---- Save Gemini key from inline terminal prompt & retry ----
function saveTerminalGeminiKey() {
  const input = document.getElementById('terminalGeminiKeyInput');
  if (!input) return;
  const key = input.value.trim();
  if (!key) { input.style.borderColor = '#ef4444'; return; }
  // Save to localStorage (same key the app uses everywhere)
  localStorage.setItem('cm_gemini_key', key);
  // Also update the global apiKey so the rest of the app picks it up immediately
  if (typeof window !== 'undefined') window.apiKey = key;
  // Retry running the code
  runTerminalCode();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('terminalPanel')) {
    setTimeout(initTerminal, 500);
  }
});

// Auto-save code
setInterval(saveTerminalCode, 3000);
