// ============================================================
// RUN CODE — NATIVE ENGINE
// ============================================================
let pyodideInstance = null;
let pyodideLoading = false;

async function initPyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) {
    // Wait for existing init
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (pyodideInstance) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
    return pyodideInstance;
  }
  pyodideLoading = true;
  try {
    pyodideInstance = await loadPyodide();
    return pyodideInstance;
  } finally {
    pyodideLoading = false;
  }
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

async function runCode() {
  const code = document.getElementById('codeEditor').value.trim();
  if (!code) { setOutput('⚠️ No code to run!', 'warn'); return; }

  const btn = document.getElementById('runBtn');
  btn.disabled = true; btn.textContent = '⏳';

  const t0 = performance.now();

  try {
    if (currentLang === 'html') {
      openPreview(); renderPreview();
      setOutput('✅ HTML rendered in Preview →', 'ok', performance.now() - t0);
    } else if (currentLang === 'javascript') {
      runJavaScript(code, t0);
    } else if (currentLang === 'python') {
      await runPython(code, t0);
    } else {
      // Try free runners in order: Piston → Wandbox → Gemini AI → Judge0 (keyed)
      const usedPiston = await runViaPiston(code, t0);
      if (!usedPiston) {
        const usedWandbox = await runViaWandbox(code, t0);
        if (!usedWandbox) {
          const usedGemini = await runViaGeminiExec(code, t0);
          if (!usedGemini) {
            if (judge0Key) {
              await runViaJudge0(code, t0);
            } else {
              setOutput('⚠️ All free runners are temporarily unavailable. Try again in a few seconds!', 'warn');
            }
          }
        }
      }
    }
  } catch (e) {
    setOutput('❌ ' + e.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = '▶ Run';
  }
}

async function runPython(code, t0) {
  setOutput('⏳ Loading Python runtime (first run may take a few seconds)...', 'loading');
  try {
    const pyodide = await initPyodide();
    const logs = [];
    const errors = [];
    // Capture print statements
    pyodide.runPython(`
import sys
from io import StringIO
old_stdout = sys.stdout
sys.stdout = captured_output = StringIO()
old_stderr = sys.stderr
sys.stderr = captured_err = StringIO()
`);
    try {
      await pyodide.runPythonAsync(code);
    } finally {
      // Get output
      const stdout = pyodide.runPython("captured_output.getvalue()");
      const stderr = pyodide.runPython("captured_err.getvalue()");
      // Reset stdout/stderr
      pyodide.runPython(`
sys.stdout = old_stdout
sys.stderr = old_stderr
`);
      const elapsed = performance.now() - t0;
      const output = [stdout, stderr].filter(Boolean).join('\n').trim() || '(no output)';
      const ok = !stderr;
      setOutput(output, ok ? 'ok' : 'err', elapsed, ok ? 'Pyodide OK' : 'Error');
    }
  } catch (e) {
    const elapsed = performance.now() - t0;
    setOutput('❌ Python Error:\n' + e.message, 'err', elapsed);
  }
}

// ---- JavaScript: native in-browser sandboxed execution ----
function runJavaScript(code, t0) {
  const logs = [];
  const errors = [];
  const sandbox = {
    console: {
      log: (...a) => logs.push(a.map(stringify).join(' ')),
      error: (...a) => errors.push(a.map(stringify).join(' ')),
      warn: (...a) => logs.push('⚠️ ' + a.map(stringify).join(' ')),
      info: (...a) => logs.push('ℹ️ ' + a.map(stringify).join(' ')),
      table: (v) => logs.push(JSON.stringify(v, null, 2)),
      dir: (v) => logs.push(JSON.stringify(v, null, 2)),
    },
    alert: (m) => logs.push('[alert] ' + m),
    prompt: (m) => { logs.push('[prompt] ' + m); return ''; },
    confirm: (m) => { logs.push('[confirm] ' + m); return true; },
    JSON, Math, Date, Array, Object, Map, Set, Number, String, Boolean,
    Symbol, RegExp, Error, TypeError, RangeError, SyntaxError, ReferenceError,
    parseInt, parseFloat, isNaN, isFinite, NaN, Infinity, undefined,
    encodeURIComponent, decodeURIComponent, encodeURI, decodeURI,
    Promise,
    queueMicrotask: (fn) => Promise.resolve().then(fn),
    Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array,
    Float32Array, Float64Array, BigInt64Array, BigUint64Array, ArrayBuffer, DataView,
    WeakMap, WeakSet, WeakRef,
    URL, URLSearchParams,
    TextEncoder, TextDecoder,
    performance: { now: () => performance.now() },
    crypto: { getRandomValues: (a) => crypto.getRandomValues(a) },
    BigInt,
    setTimeout: () => {}, setInterval: () => {}, clearTimeout: () => {}, clearInterval: () => {},
    structuredClone: (v) => JSON.parse(JSON.stringify(v)),
    fetch: (...args) => fetch(...args),
  };

  try {
    const fn = new Function(...Object.keys(sandbox), code);
    const result = fn(...Object.values(sandbox));
    const elapsed = performance.now() - t0;
    let out = logs.join('\n');
    if (errors.length) out += (out ? '\n' : '') + errors.map(e => '❌ ' + e).join('\n');
    if (result !== undefined && result !== null && logs.length === 0)
      out = stringify(result);
    if (!out) out = '(no output — use console.log() to print values)';
    setOutput(out, errors.length ? 'err' : 'ok', elapsed);
  } catch(e) {
    const elapsed = performance.now() - t0;
    setOutput('❌ ' + e.name + ': ' + e.message + '\n\n' + (e.stack || ''), 'err', elapsed);
  }
}

function stringify(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'object') {
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  }
  return String(v);
}

// ---- Other languages: Judge0 CE API ----
async function runViaJudge0(code, t0) {
  const langId = J0_IDS[currentLang];
  if (!langId) {
    setOutput(`⚠️ "${LANG_LABELS[currentLang]}" is not supported by Judge0.`, 'warn');
    return;
  }
  if (!judge0Key) {
    setOutput('⚠️ No Judge0 key set.', 'warn');
    return;
  }

  setOutput('⏳ Compiling & executing via Judge0...', 'loading');
  const stdin = document.getElementById('stdinInput').value.replace(/\\n/g, '\n');
  const hdrs = {
    'Content-Type': 'application/json',
    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
    'X-RapidAPI-Key': judge0Key,
  };

  let token;
  try {
    const submitRes = await fetch(
      'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=false',
      {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({
          language_id: langId,
          source_code: toBase64(code),
          stdin: toBase64(stdin),
        }),
      }
    );
    if (!submitRes.ok) {
      const err = await submitRes.text();
      throw new Error('Judge0 submit error: ' + err);
    }
    ({ token } = await submitRes.json());
  } catch (e) {
    setOutput('❌ ' + e.message, 'err');
    return;
  }

  try {
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 900));
      const pollRes = await fetch(
        `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=true`,
        { headers: hdrs }
      );
      if (!pollRes.ok) throw new Error(`Poll HTTP ${pollRes.status}`);
      const data = await pollRes.json();

      if (data.status?.id <= 2) continue;

      const elapsed = performance.now() - t0;
      const decode = b64 => { try { return decodeURIComponent(escape(atob(b64))); } catch { return b64 || ''; } };
      const stdout = decode(data.stdout);
      const stderr = decode(data.stderr);
      const compileOut = decode(data.compile_output);
      const status = data.status?.description || 'Unknown';
      const time = data.time ? data.time + 's' : null;
      const mem = data.memory ? (data.memory / 1024).toFixed(1) + ' MB' : null;

      if (stdout) {
        setOutput(stdout, data.status?.id === 3 ? 'ok' : 'warn', elapsed, status, time, mem);
      } else if (compileOut) {
        setOutput('📦 Compile Error:\n' + compileOut, 'err', elapsed, status);
      } else if (stderr) {
        setOutput('❌ Runtime Error:\n' + stderr, 'err', elapsed, status);
      } else {
        setOutput('(no output)\nStatus: ' + status, 'ok', elapsed, status, time, mem);
      }
      return;
    }
    setOutput('⏳ Timed out after 15 attempts. Judge0 may be busy.', 'warn');
  } catch (e) {
    setOutput('❌ Poll error: ' + e.message, 'err');
  }
}

async function runViaPiston(code, t0) {
  const runtimes = await getPistonRuntimes();
  const runtime = runtimes[currentLang];
  if (!runtime) return false;

  setOutput(`⏳ Running with free no-key runner (${runtime.language})...`, 'loading');
  const stdin = document.getElementById('stdinInput').value.replace(/\\n/g, '\n');

  try {
    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ content: code }],
        stdin
      })
    });

    if (!res.ok) throw new Error(`Piston HTTP ${res.status}`);
    const data = await res.json();
    const elapsed = performance.now() - t0;
    const run = data.run || {};
    const compile = data.compile || {};
    const stdout = [compile.stdout, run.stdout].filter(Boolean).join('\n').trim();
    const stderr = [compile.stderr, run.stderr].filter(Boolean).join('\n').trim();
    const output = stdout || stderr || '(no output)';
    const ok = (run.code ?? 0) === 0 && !stderr;
    setOutput(output, ok ? 'ok' : 'err', elapsed, ok ? 'Piston OK' : `Exit ${run.code ?? '?'}`);
    return true;
  } catch(e) {
    return false;
  }
}

// ---- Wandbox (free, no key) fallback for main editor ----
const WANDBOX_COMPILER_MAP = {
  cpp: 'gcc-head', c: 'gcc-head', java: 'openjdk-head',
  rust: 'rust-head', go: 'go-head', ruby: 'ruby-head',
  php: 'php-head', swift: 'swift-head', bash: 'bash',
  perl: 'perl-head', scala: 'scala-head', haskell: 'ghc-head',
  typescript: 'typescript-4.9.5', csharp: 'csharp',
};

async function runViaWandbox(code, t0) {
  const compiler = WANDBOX_COMPILER_MAP[currentLang];
  if (!compiler) return false;

  setOutput('⏳ Trying Wandbox (free, no key)...', 'loading');
  const stdin = document.getElementById('stdinInput')?.value || '';

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15000);

    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compiler, code, stdin, save: false }),
      signal: controller.signal,
    });

    if (!res.ok) return false;
    const data = await res.json();
    const elapsed = performance.now() - t0;
    const output = data.program_output || data.program_error || data.compiler_error || '(no output)';
    const isOk = data.status === '0' || data.status === 0;
    setOutput(output, isOk ? 'ok' : 'err', elapsed, isOk ? 'Wandbox OK' : 'Wandbox Error');
    return true;
  } catch(e) {
    return false;
  }
}

// ---- Gemini AI Code Execution fallback for main editor ----
async function runViaGeminiExec(code, t0) {
  const key = localStorage.getItem('cm_gemini_key');
  if (!key) return false;

  const langLabels = { cpp: 'C++', c: 'C', java: 'Java', rust: 'Rust', go: 'Go',
    ruby: 'Ruby', php: 'PHP', swift: 'Swift', kotlin: 'Kotlin', scala: 'Scala',
    typescript: 'TypeScript', csharp: 'C#', r: 'R', perl: 'Perl', haskell: 'Haskell' };
  const langName = langLabels[currentLang] || currentLang;

  setOutput('✨ Trying Gemini AI code execution...', 'loading');

  const prompt = `Execute this ${langName} code and return ONLY the exact program output (stdout). If there is an error, return only the error. No explanation, no markdown.

\`\`\`${currentLang}\n${code}\n\`\`\``;

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20000);

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
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

    if (!resp.ok) return false;
    const data = await resp.json();
    const elapsed = performance.now() - t0;

    let output = '';
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.executableCode) continue;
      if (part.codeExecutionResult) { output = part.codeExecutionResult.output || ''; break; }
      if (part.text) output = part.text.trim();
    }

    if (!output) return false;
    output = output.replace(/^```[\w]*\n?/m, '').replace(/\n?```$/m, '').trim();
    setOutput(output, 'ok', elapsed, 'Gemini AI ✨');
    return true;
  } catch(e) {
    return false;
  }
}

// ---- Output setter ----
function setOutput(text, type, elapsed, status, time, mem) {
  const box = document.getElementById('outputBox');
  const meta = document.getElementById('execMeta');
  const sb = document.getElementById('sbExecInfo');
  box.textContent = text;
  box.className = 'output-box ' + {ok:'',err:'err-out',warn:'warn-out',loading:'muted-out'}[type||'ok'];

  let metaHTML = '';
  if (status) metaHTML += `<span class="exec-badge ${type==='ok'?'exec-ok':type==='err'?'exec-err':'exec-warn'}">${status}</span>`;
  if (elapsed) {
    const ms = elapsed.toFixed(1);
    metaHTML += `<span class="exec-badge exec-info">⏱ ${ms}ms</span>`;
    sb.textContent = `⏱ ${ms}ms`;
  }
  if (time) metaHTML += `<span class="exec-badge exec-ok">⚡ ${time}</span>`;
  if (mem) metaHTML += `<span class="exec-badge exec-info">💾 ${mem}</span>`;
  meta.innerHTML = metaHTML;
}

