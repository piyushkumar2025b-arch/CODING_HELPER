// ============================================================
// RUN CODE — NATIVE ENGINE
// ============================================================
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
    } else {
      await runViaJudge0(code, t0);
    }
  } catch(e) {
    setOutput('❌ ' + e.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = '▶ Run';
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
    setOutput(`⚠️ "${LANG_LABELS[currentLang]}" is not supported by Judge0 free tier.\n\nSupported: Python, Java, C++, C, C#, Go, Rust, Kotlin, Swift, Ruby, PHP, TypeScript, Scala, R, Dart`, 'warn');
    return;
  }
  if (!judge0Key) {
    const usedPiston = await runViaPiston(code, t0);
    if (!usedPiston) {
      setOutput(`⚠️ No free runner is available for ${LANG_LABELS[currentLang]} right now.\n\nFallbacks tried:\n1. Browser-native runner for JavaScript/HTML\n2. Piston public runner for compiled/interpreted languages\n\nOptional: add a Judge0 RapidAPI key from the "Judge0" badge for a more reliable hosted runner.`, 'warn');
    }
    return;
  }

  setOutput('⏳ Compiling & executing...', 'loading');
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

