// CodeMind Code Terminal - Live Compiler with Multi-Language Support
// Uses free APIs: Piston (primary), Judge0 (fallback)

const TERMINAL_LANGUAGES = [
  { name: 'JavaScript', id: 'javascript', icon: '⚡', piston: 'javascript', judge0: 63, runtime: 'node' },
  { name: 'Python', id: 'python', icon: '🐍', piston: 'python', judge0: 71, runtime: 'python3' },
  { name: 'Java', id: 'java', icon: '☕', piston: 'java', judge0: 62, runtime: 'java' },
  { name: 'C++', id: 'cpp', icon: '⚙️', piston: 'cpp', judge0: 54, runtime: 'g++' },
  { name: 'C', id: 'c', icon: 'Ⓒ', piston: 'c', judge0: 50, runtime: 'gcc' },
  { name: 'C#', id: 'csharp', icon: '#️⃣', piston: 'csharp', judge0: 51, runtime: 'dotnet' },
  { name: 'Go', id: 'go', icon: '🐹', piston: 'go', judge0: 60, runtime: 'go' },
  { name: 'Rust', id: 'rust', icon: '🦀', piston: 'rust', judge0: 73, runtime: 'rustc' },
  { name: 'Ruby', id: 'ruby', icon: '💎', piston: 'ruby', judge0: 72, runtime: 'ruby' },
  { name: 'PHP', id: 'php', icon: '🐘', piston: 'php', judge0: 68, runtime: 'php' },
  { name: 'TypeScript', id: 'typescript', icon: '📘', piston: 'typescript', judge0: 74, runtime: 'ts-node' },
  { name: 'Kotlin', id: 'kotlin', icon: '🎯', piston: 'kotlin', judge0: 78, runtime: 'kotlin' },
  { name: 'Swift', id: 'swift', icon: '🍎', piston: 'swift', judge0: 83, runtime: 'swift' },
  { name: 'R', id: 'r', icon: 'Ⓡ', piston: 'r', judge0: 80, runtime: 'Rscript' },
  { name: 'SQL', id: 'sql', icon: '🗃️', piston: 'sql', judge0: 82, runtime: 'sqlite3' },
  { name: 'Bash', id: 'bash', icon: '🔧', piston: 'bash', judge0: 46, runtime: 'bash' },
  { name: 'Shell', id: 'shell', icon: '🖥️', piston: 'shell', judge0: 46, runtime: 'sh' },
  { name: 'Perl', id: 'perl', icon: '🐪', piston: 'perl', judge0: 65, runtime: 'perl' },
  { name: 'Scala', id: 'scala', icon: '📊', piston: 'scala', judge0: 81, runtime: 'scala' },
  { name: 'Haskell', id: 'haskell', icon: 'λ', piston: 'haskell', judge0: 61, runtime: 'ghc' },
];

const PISTON_API = 'https://emkc.org/api/v2/piston';
const JUDGE0_API = 'https://judge0-ce.p.rapidapi.com';

let terminalState = {
  currentLang: 'javascript',
  code: localStorage.getItem('cm_terminal_code') || '// Welcome to Code Terminal\nconsole.log("Hello, World!");',
  input: '',
  isRunning: false,
  isFullscreen: false,
  theme: 'dark',
};

function initTerminal() {
  renderTerminalLanguages();
  loadTerminalCode();
  attachTerminalEvents();
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

  selector.value = terminalState.currentLang;
  selector.onchange = (e) => changeTerminalLanguage(e.target.value);
}

function changeTerminalLanguage(langId) {
  terminalState.currentLang = langId;
  const lang = TERMINAL_LANGUAGES.find(l => l.id === langId);
  
  if (window.terminalEditor) {
    window.terminalEditor.setOption('mode', getCodeMirrorMode(lang.name));
  }

  // Set language-specific templates
  const templates = {
    javascript: '// JavaScript\nconsole.log("Hello, World!");',
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

  if (templates[langId] && window.terminalEditor && !window.terminalEditor.getValue().trim().includes('class')) {
    window.terminalEditor.setValue(templates[langId]);
  }

  document.getElementById('terminalLangLabel').textContent = lang.name;
}

function attachTerminalEvents() {
  const runBtn = document.getElementById('terminalRunBtn');
  const clearBtn = document.getElementById('terminalClearBtn');
  const fullscreenBtn = document.getElementById('terminalFullscreenBtn');

  if (runBtn) runBtn.onclick = () => runTerminalCode();
  if (clearBtn) clearBtn.onclick = () => clearTerminal();
  if (fullscreenBtn) fullscreenBtn.onclick = () => toggleTerminalFullscreen();
}

async function runTerminalCode() {
  const code = window.terminalEditor ? window.terminalEditor.getValue() : terminalState.code;
  const input = document.getElementById('terminalStdin')?.value || '';
  const outputBox = document.getElementById('terminalOutput');

  if (!code.trim()) {
    outputBox.innerHTML = '<div class="terminal-msg warn">⚠️ No code to run</div>';
    return;
  }

  const runBtn = document.getElementById('terminalRunBtn');
  runBtn.disabled = true;
  runBtn.textContent = '⏳ Running...';
  
  outputBox.innerHTML = '<div class="terminal-msg info">🔄 Executing...</div>';

  try {
    const result = await executeCode(code, input);
    
    if (result.success) {
      const output = result.output || '(no output)';
      const htmlOutput = `<div class="output-success">
        <div class="output-time">⏱️ ${result.time || '0'}s</div>
        <pre>${escapeHtml(output)}</pre>
      </div>`;
      outputBox.innerHTML = htmlOutput;
    } else {
      const err = result.error || result.message || 'Unknown error';
      const htmlErr = `<div class="output-error">
        <div class="error-title">❌ Error</div>
        <pre>${escapeHtml(err)}</pre>
      </div>`;
      outputBox.innerHTML = htmlErr;
    }
  } catch (err) {
    outputBox.innerHTML = `<div class="terminal-msg error">⚠️ ${err.message}</div>`;
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '▶ Run';
  }
}

async function executeCode(code, input) {
  const lang = TERMINAL_LANGUAGES.find(l => l.id === terminalState.currentLang);

  // Try Piston API first (free, no key required)
  try {
    const result = await executePiston(code, input, lang);
    if (result.success || result.error) return result;
  } catch (err) {
    console.log('Piston failed, trying Judge0...');
  }

  // Fallback to Judge0
  try {
    return await executeJudge0(code, input, lang);
  } catch (err) {
    return {
      success: false,
      error: `Both APIs failed: ${err.message}`,
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

function toggleTerminalFullscreen() {
  const terminal = document.getElementById('terminalPanel');
  const container = document.getElementById('terminalContainer');
  
  if (!terminalState.isFullscreen) {
    document.body.style.overflow = 'hidden';
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.zIndex = '9999';
    terminalState.isFullscreen = true;
    document.getElementById('terminalFullscreenBtn').textContent = '⛔ Exit Fullscreen';
  } else {
    document.body.style.overflow = '';
    container.style.position = '';
    container.style.inset = '';
    container.style.zIndex = '';
    terminalState.isFullscreen = false;
    document.getElementById('terminalFullscreenBtn').textContent = '🔲 Fullscreen';
  }
}

function clearTerminal() {
  if (window.terminalEditor) {
    window.terminalEditor.setValue('');
  }
  document.getElementById('terminalStdin').value = '';
  document.getElementById('terminalOutput').innerHTML = '<div class="terminal-msg muted">Output will appear here...</div>';
  terminalState.code = '';
}

function loadTerminalCode() {
  const saved = localStorage.getItem('cm_terminal_code');
  if (saved && window.terminalEditor) {
    window.terminalEditor.setValue(saved);
  }
}

function saveTerminalCode() {
  if (window.terminalEditor) {
    const code = window.terminalEditor.getValue();
    localStorage.setItem('cm_terminal_code', code);
    terminalState.code = code;
  }
}

function getCodeMirrorMode(langName) {
  const modeMap = {
    JavaScript: 'javascript',
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

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('terminalPanel')) {
    setTimeout(initTerminal, 500);
  }
});

// Auto-save code
setInterval(saveTerminalCode, 3000);
