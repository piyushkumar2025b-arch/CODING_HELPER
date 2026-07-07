/**
 * ══════════════════════════════════════════════════════════
 *  CodeMind — API Controller & Live Tester
 *  Drop this <script> tag at the END of codemind_working.html
 *  just before </body>, after all other scripts.
 *
 *  Usage:
 *    <script src="codemind_api_controller.js"></script>
 *
 *  What it does:
 *  1. Loads saved keys from localStorage (same keys the app uses)
 *  2. Tests every API — keyed and free — with a real ping
 *  3. Reports PASS / FAIL / WARN per API in a floating panel
 *  4. Auto-injects valid keys into the app's globals (apiKey,
 *     judge0Key, ghToken) so every feature works immediately
 *  5. Updates the header badges to reflect live status
 * ══════════════════════════════════════════════════════════
 */

(function CodeMindAPIController() {
  'use strict';

  // ── 1. KEY SOURCES ──────────────────────────────────────
  // Reads from the exact localStorage keys the app uses

  const KEYS = {
    gemini:  'cm_gemini_key',
    judge0:  'cm_j0_key',
    github:  'cm_gh_token',
  };

  function getKey(k)    { return localStorage.getItem(k) || ''; }
  function setKey(k, v) { localStorage.setItem(k, v); }

  // ── 2. TEST DEFINITIONS ─────────────────────────────────
  // Each entry: { id, label, group, needsKey, keyRef, test() → { ok, msg } }

  const TESTS = [

    // ── KEYED APIS ──────────────────────────────────────

    {
      id: 'gemini',
      label: 'Gemini AI',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.gemini,
      keyPlaceholder: 'AIza...',
      keyHint: 'console.cloud.google.com → APIs & Services → Credentials (free)',
      async test(key) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: ok' }] }],
            generationConfig: { maxOutputTokens: 10 }
          })
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          return { ok: false, msg: e?.error?.message || `HTTP ${res.status}` };
        }
        const d = await res.json();
        const text = d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { ok: text.length > 0, msg: text.length ? `✓ Model replied: "${text.trim()}"` : 'Empty response' };
      }
    },

    {
      id: 'judge0',
      label: 'Judge0 (RapidAPI)',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.judge0,
      keyPlaceholder: 'RapidAPI key...',
      keyHint: 'rapidapi.com → search "Judge0 CE" → subscribe free plan',
      async test(key) {
        // Submit a tiny Python snippet
        const sub = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=false', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': key,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
          },
          body: JSON.stringify({
            language_id: 71, // Python 3
            source_code: btoa('print("cm_ok")'),
            stdin: ''
          })
        });
        if (!sub.ok) return { ok: false, msg: `Submit failed: HTTP ${sub.status}` };
        const { token } = await sub.json();
        if (!token) return { ok: false, msg: 'No token returned — key may be invalid' };

        // Poll once (wait 1.5 s)
        await new Promise(r => setTimeout(r, 1500));
        const poll = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=true`, {
          headers: {
            'X-RapidAPI-Key': key,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
          }
        });
        if (!poll.ok) return { ok: false, msg: `Poll failed: HTTP ${poll.status}` };
        const r = await poll.json();
        const stdout = r.stdout ? atob(r.stdout).trim() : '';
        const ok = r.status?.id >= 3; // finished
        return {
          ok,
          msg: ok
            ? `✓ Execution OK — stdout: "${stdout || '(empty)'}"`
            : `Still queued (status: ${r.status?.description})`
        };
      }
    },

    {
      id: 'github',
      label: 'GitHub Token',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.github,
      keyPlaceholder: 'ghp_...',
      keyHint: 'github.com → Settings → Developer settings → Personal access tokens → Fine-grained (free)',
      async test(key) {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `token ${key}`,
            'User-Agent': 'CodeMind-Tester'
          }
        });
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status} — token invalid or expired` };
        const d = await res.json();
        const remaining = res.headers.get('X-RateLimit-Remaining');
        return {
          ok: true,
          msg: `✓ Authenticated as @${d.login} · rate limit remaining: ${remaining ?? '?'}`
        };
      }
    },

    // ── FREE APIS (no key) ───────────────────────────────

    {
      id: 'openmeteo',
      label: 'Weather (Open-Meteo)',
      group: 'Free',
      needsKey: false,
      async test() {
        const geo = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=London&count=1&language=en&format=json');
        if (!geo.ok) return { ok: false, msg: `Geocoding: HTTP ${geo.status}` };
        const g = await geo.json();
        const loc = g.results?.[0];
        if (!loc) return { ok: false, msg: 'Geocoding returned no results' };
        const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`);
        if (!wx.ok) return { ok: false, msg: `Forecast: HTTP ${wx.status}` };
        const w = await wx.json();
        const temp = w.current_weather?.temperature;
        return { ok: temp !== undefined, msg: `✓ London: ${temp}°C` };
      }
    },

    {
      id: 'npm',
      label: 'npm Registry',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://registry.npmjs.org/react');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.name, msg: `✓ react@${d['dist-tags']?.latest}` };
      }
    },

    {
      id: 'pypi',
      label: 'PyPI',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://pypi.org/pypi/numpy/json');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.info?.version, msg: `✓ numpy ${d.info.version}` };
      }
    },

    {
      id: 'crates',
      label: 'crates.io',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://crates.io/api/v1/crates/serde', {
          headers: { 'User-Agent': 'CodeMind-Tester' }
        });
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.crate?.newest_version, msg: `✓ serde ${d.crate.newest_version}` };
      }
    },

    {
      id: 'github_public',
      label: 'GitHub API (public)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.github.com/repos/torvalds/linux', {
          headers: { 'User-Agent': 'CodeMind-Tester' }
        });
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        const remaining = res.headers.get('X-RateLimit-Remaining');
        return { ok: !!d.id, msg: `✓ Unauthenticated · rate limit remaining: ${remaining ?? '?'}` };
      }
    },

    {
      id: 'mdn',
      label: 'MDN Docs Search',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://developer.mozilla.org/api/v1/search?q=array&locale=en-US');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.documents?.length > 0, msg: `✓ ${d.count} results for "array"` };
      }
    },

    {
      id: 'hacknews',
      label: 'Hacker News',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const ids = await res.json();
        return { ok: Array.isArray(ids) && ids.length > 0, msg: `✓ ${ids.length} stories` };
      }
    },

    {
      id: 'thecolorapi',
      label: 'The Color API',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://www.thecolorapi.com/id?hex=00e5ff&format=json');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.name?.value, msg: `✓ #00e5ff = "${d.name.value}"` };
      }
    },

    {
      id: 'ipapi',
      label: 'IP Geolocation (ipapi)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return {
          ok: !!d.ip,
          msg: d.reserved
            ? '✓ Reachable (private/reserved IP — expected in local dev)'
            : `✓ IP: ${d.ip} · ${d.city}, ${d.country_name}`
        };
      }
    },

    {
      id: 'mymemory',
      label: 'MyMemory Translate',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.mymemory.translated.net/get?q=Hello+world&langpair=en|es');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        const out = d.responseData?.translatedText;
        return { ok: !!out, msg: `✓ "Hello world" → "${out}"` };
      }
    },

    {
      id: 'restcountries',
      label: 'REST Countries',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://restcountries.com/v3.1/name/Germany?fullText=true');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d[0]?.name?.common === 'Germany', msg: `✓ Germany · capital: ${d[0]?.capital?.[0]}` };
      }
    },

    {
      id: 'openexchange',
      label: 'Exchange Rates (open.er-api)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return {
          ok: d.result === 'success',
          msg: d.result === 'success' ? `✓ USD → INR: ${d.rates?.INR?.toFixed(2)}` : d['error-type'] || 'Unknown error'
        };
      }
    },

    {
      id: 'jokeapi',
      label: 'JokeAPI (Dev jokes)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://v2.jokeapi.dev/joke/Programming?safe-mode');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return {
          ok: !d.error,
          msg: d.error ? d.message : `✓ Got a ${d.type} joke (category: ${d.category})`
        };
      }
    },

    {
      id: 'arxiv',
      label: 'arXiv Papers',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://export.arxiv.org/api/query?search_query=all:transformer&max_results=1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const text = await res.text();
        const ok = text.includes('<entry>');
        return { ok, msg: ok ? '✓ arXiv returned results' : 'No entries found' };
      }
    },

    {
      id: 'semanticscholar',
      label: 'Semantic Scholar',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.semanticscholar.org/graph/v1/paper/search?query=attention&limit=1&fields=title');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return {
          ok: d.data?.length > 0,
          msg: d.data?.length > 0 ? `✓ First result: "${d.data[0].title?.substring(0, 50)}…"` : 'No results'
        };
      }
    },

    {
      id: 'leetcode',
      label: 'LeetCode Stats API',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://alfa-leetcode-api.onrender.com/userDetails/neal_wu');
        // This API is a free community service and can be slow
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status} (may be slow/cold-start)` };
        const d = await res.json();
        return { ok: !!d.username, msg: `✓ User: ${d.username} · solved: ${d.totalSolved ?? '?'}` };
      }
    },

    {
      id: 'gitignore',
      label: 'gitignore.io (Toptal)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://www.toptal.com/developers/gitignore/api/python');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const text = await res.text();
        return { ok: text.includes('# Created by'), msg: '✓ .gitignore generated for Python' };
      }
    },

    {
      id: 'exercism',
      label: 'Exercism API',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://exercism.org/api/v2/exercises?track_slug=python&per_page=1', {
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return {
          ok: d.exercises?.length > 0,
          msg: d.exercises?.length > 0 ? `✓ First exercise: "${d.exercises[0].slug}"` : 'No exercises'
        };
      }
    },

    {
      id: 'huggingface',
      label: 'Hugging Face Models',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://huggingface.co/api/models?search=bert&limit=1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.length > 0, msg: d.length > 0 ? `✓ First model: ${d[0].modelId}` : 'No models' };
      }
    },

  ];

  // ── 3. INJECT KEYS INTO APP GLOBALS ─────────────────────

  function injectKeys() {
    const gemini = getKey(KEYS.gemini);
    const j0     = getKey(KEYS.judge0);
    const gh     = getKey(KEYS.github);

    if (gemini && typeof window.apiKey !== 'undefined') {
      window.apiKey = gemini;
    }
    if (j0 && typeof window.judge0Key !== 'undefined') {
      window.judge0Key = j0;
    }
    if (gh && typeof window.ghToken !== 'undefined') {
      window.ghToken = gh;
    }

    // Also refresh the header badge
    if (typeof window.updateAPIStatus === 'function') {
      window.updateAPIStatus();
    } else {
      // Manually update the dot + badge text
      const dot  = document.querySelector('.dot');
      const badge = document.querySelector('.api-badge');
      if (dot && badge) {
        if (gemini) {
          dot.classList.add('connected');
          const txt = badge.querySelector('span') || badge;
          if (txt.childNodes.length > 1) txt.childNodes[1].textContent = ' Gemini ✓';
        }
      }
      // Judge0 badge
      const j0badge = document.querySelector('#j0Badge') || [...document.querySelectorAll('.api-badge')].find(b => b.textContent.includes('Judge0'));
      if (j0badge) {
        const j0dot = j0badge.querySelector('.dot');
        if (j0dot) j0dot.classList.toggle('connected', !!j0);
      }
    }
  }

  // ── 4. UI PANEL ─────────────────────────────────────────

  const PANEL_ID = 'cm_api_tester_panel';

  const STYLES = `
    #cm_api_tester_panel {
      position: fixed; bottom: 16px; right: 16px; z-index: 99999;
      width: 400px; max-height: 82vh;
      background: #0d0d14; border: 1px solid #2a2a3a;
      border-radius: 14px; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,.8);
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      display: flex; flex-direction: column;
    }
    #cm_api_tester_panel.collapsed { max-height: 46px; }
    #cm_atp_header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; background: #111120;
      border-bottom: 1px solid #2a2a3a; cursor: pointer; flex-shrink: 0;
    }
    #cm_atp_header h3 {
      font-size: 12px; font-weight: 700; letter-spacing: 1px;
      text-transform: uppercase; color: #00e5ff; margin: 0;
    }
    #cm_atp_header span { font-size: 11px; color: #6b6b80; }
    #cm_atp_body { overflow-y: auto; flex: 1; padding: 10px; }
    .cm_atp_group_label {
      font-size: 9px; font-weight: 700; letter-spacing: 2px;
      text-transform: uppercase; color: #6b6b80;
      margin: 8px 0 5px; padding: 0 2px;
    }
    .cm_atp_row {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 9px; margin-bottom: 4px;
      border-radius: 8px; background: #14141c;
      border: 1px solid #2a2a3a;
      transition: border-color .15s;
    }
    .cm_atp_row:hover { border-color: #3a3a5a; }
    .cm_atp_icon { font-size: 13px; flex-shrink: 0; width: 18px; text-align: center; }
    .cm_atp_name { font-size: 11px; color: #e8e8f0; font-weight: 700; flex-shrink: 0; width: 150px; }
    .cm_atp_msg  { font-size: 10px; color: #6b6b80; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cm_atp_status_pass { color: #10b981; }
    .cm_atp_status_fail { color: #ef4444; }
    .cm_atp_status_warn { color: #f59e0b; }
    .cm_atp_status_pend { color: #6b6b80; animation: cm_blink 1s infinite; }
    @keyframes cm_blink { 0%,100%{opacity:1} 50%{opacity:.3} }

    /* key input rows */
    .cm_atp_key_row {
      display: flex; gap: 6px; margin: 5px 0 9px;
      padding: 8px 9px; background: #0a0a0f;
      border: 1px solid #2a2a3a; border-radius: 8px;
    }
    .cm_atp_key_row input {
      flex: 1; background: #18181f; border: 1px solid #2a2a3a;
      border-radius: 6px; color: #e8e8f0; font-family: inherit;
      font-size: 11px; padding: 5px 9px; outline: none;
    }
    .cm_atp_key_row input:focus { border-color: #00e5ff; }
    .cm_atp_key_row input::placeholder { color: #3a3a5a; }
    .cm_atp_key_btn {
      background: #1c1c2a; border: 1px solid #3a3a5a; color: #00e5ff;
      border-radius: 6px; font-size: 10px; font-weight: 700; padding: 5px 10px;
      cursor: pointer; white-space: nowrap; font-family: inherit;
      transition: background .15s;
    }
    .cm_atp_key_btn:hover { background: rgba(0,229,255,.1); }
    .cm_atp_hint {
      font-size: 9px; color: #3a3a5a; margin: -6px 0 8px 2px; line-height: 1.5;
    }

    /* bottom bar */
    #cm_atp_footer {
      display: flex; gap: 7px; padding: 9px 10px;
      border-top: 1px solid #2a2a3a; background: #111120; flex-shrink: 0;
    }
    .cm_atp_footer_btn {
      flex: 1; padding: 7px; border-radius: 8px; font-size: 11px;
      font-weight: 700; cursor: pointer; font-family: inherit;
      transition: all .15s; border: 1px solid #2a2a3a;
      background: #1c1c2a; color: #e8e8f0;
    }
    .cm_atp_footer_btn:hover { border-color: #00e5ff; color: #00e5ff; }
    .cm_atp_footer_btn.primary { background: rgba(0,229,255,.1); border-color: #00e5ff; color: #00e5ff; }
    #cm_atp_summary {
      font-size: 10px; color: #6b6b80; padding: 4px 10px 6px;
      text-align: center; flex-shrink: 0;
    }
  `;

  function buildPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div id="cm_atp_header">
        <h3>⚡ API Controller</h3>
        <span id="cm_atp_toggle_txt">▾ collapse</span>
      </div>
      <div id="cm_atp_body">
        <div id="cm_atp_keyed_section">
          <div class="cm_atp_group_label">🔑 Keys Required</div>
          ${buildKeyedSection()}
        </div>
        <div id="cm_atp_free_section">
          <div class="cm_atp_group_label">🌐 Free APIs</div>
          ${buildFreeRows()}
        </div>
      </div>
      <div id="cm_atp_summary">Press Run All Tests to check every API</div>
      <div id="cm_atp_footer">
        <button class="cm_atp_footer_btn primary" onclick="window._cmATP.runAll()">▶ Run All Tests</button>
        <button class="cm_atp_footer_btn" onclick="window._cmATP.injectAndClose()">💉 Inject Keys & Close</button>
      </div>
    `;
    document.body.appendChild(panel);

    // Collapse toggle
    document.getElementById('cm_atp_header').addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      document.getElementById('cm_atp_toggle_txt').textContent =
        panel.classList.contains('collapsed') ? '▴ expand' : '▾ collapse';
    });
  }

  function buildKeyedSection() {
    return TESTS.filter(t => t.needsKey).map(t => {
      const saved = getKey(t.keyRef);
      return `
        <div class="cm_atp_row" id="cm_atp_row_${t.id}">
          <span class="cm_atp_icon cm_atp_status_pend" id="cm_atp_icon_${t.id}">◉</span>
          <span class="cm_atp_name">${t.label}</span>
          <span class="cm_atp_msg" id="cm_atp_msg_${t.id}">
            ${saved ? 'Key saved — click Run to verify' : 'No key set'}
          </span>
        </div>
        <div class="cm_atp_key_row">
          <input type="password" id="cm_atp_input_${t.id}"
            placeholder="${t.keyPlaceholder}"
            value="${saved}"
            oninput="window._cmATP.updateKey('${t.keyRef}', this.value)"
          />
          <button class="cm_atp_key_btn" onclick="window._cmATP.runSingle('${t.id}')">Test</button>
        </div>
        <div class="cm_atp_hint">🔗 ${t.keyHint}</div>
      `;
    }).join('');
  }

  function buildFreeRows() {
    return TESTS.filter(t => !t.needsKey).map(t => `
      <div class="cm_atp_row" id="cm_atp_row_${t.id}">
        <span class="cm_atp_icon cm_atp_status_pend" id="cm_atp_icon_${t.id}">◉</span>
        <span class="cm_atp_name">${t.label}</span>
        <span class="cm_atp_msg" id="cm_atp_msg_${t.id}">Waiting…</span>
      </div>
    `).join('');
  }

  // ── 5. TEST RUNNER ───────────────────────────────────────

  function setRowState(id, state, msg) {
    const icon = document.getElementById(`cm_atp_icon_${id}`);
    const msgEl = document.getElementById(`cm_atp_msg_${id}`);
    if (!icon || !msgEl) return;

    icon.className = 'cm_atp_icon';
    if (state === 'pass') { icon.classList.add('cm_atp_status_pass'); icon.textContent = '✓'; }
    else if (state === 'fail') { icon.classList.add('cm_atp_status_fail'); icon.textContent = '✗'; }
    else if (state === 'warn') { icon.classList.add('cm_atp_status_warn'); icon.textContent = '⚠'; }
    else { icon.classList.add('cm_atp_status_pend'); icon.textContent = '◉'; }

    msgEl.textContent = msg;
    msgEl.title = msg;
  }

  async function runTest(test) {
    const inputEl = document.getElementById(`cm_atp_input_${test.id}`);
    const key = test.needsKey
      ? (inputEl?.value?.trim() || getKey(test.keyRef))
      : '';

    if (test.needsKey && !key) {
      setRowState(test.id, 'warn', 'No key — enter one above');
      return { pass: false, warn: true };
    }

    setRowState(test.id, 'pend', 'Testing…');

    try {
      const result = await Promise.race([
        test.test(key),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout after 12s')), 12000))
      ]);
      setRowState(test.id, result.ok ? 'pass' : 'fail', result.msg);
      return { pass: result.ok };
    } catch (err) {
      setRowState(test.id, 'fail', err.message);
      return { pass: false };
    }
  }

  async function runAll() {
    const sumEl = document.getElementById('cm_atp_summary');
    if (sumEl) sumEl.textContent = 'Running all tests…';

    let pass = 0, fail = 0, warn = 0;

    for (const test of TESTS) {
      const r = await runTest(test);
      if (r.warn) warn++;
      else if (r.pass) pass++;
      else fail++;
    }

    if (sumEl) {
      sumEl.textContent = `Results: ✓ ${pass} passed · ✗ ${fail} failed · ⚠ ${warn} skipped (no key)`;
      sumEl.style.color = fail > 0 ? '#ef4444' : pass > 0 ? '#10b981' : '#f59e0b';
    }

    // Auto-inject whichever keys passed
    injectKeys();
  }

  async function runSingle(id) {
    const test = TESTS.find(t => t.id === id);
    if (!test) return;

    // Save the key from the input first
    const inputEl = document.getElementById(`cm_atp_input_${id}`);
    if (inputEl && test.keyRef) {
      const val = inputEl.value.trim();
      if (val) {
        setKey(test.keyRef, val);
        injectKeys();
      }
    }

    await runTest(test);
  }

  function updateKey(keyRef, value) {
    setKey(keyRef, value.trim());
    injectKeys();
  }

  function injectAndClose() {
    injectKeys();
    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.style.transition = 'opacity .3s, transform .3s';
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(20px)';
      setTimeout(() => panel.remove(), 350);
    }
    // Show confirmation
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:99999;
      background:#10b981;color:#fff;padding:10px 18px;border-radius:9px;
      font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;
      box-shadow:0 6px 24px rgba(0,0,0,.5);
    `;
    toast.textContent = '✓ Keys injected — all features active';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ── 6. PUBLIC API ────────────────────────────────────────

  window._cmATP = { runAll, runSingle, updateKey, injectAndClose, injectKeys };

  // ── 7. INIT ──────────────────────────────────────────────

  function init() {
    injectKeys(); // Inject any already-saved keys immediately
    buildPanel();

    // Auto-run free API tests after a short delay (non-blocking)
    setTimeout(async () => {
      const freeTests = TESTS.filter(t => !t.needsKey);
      for (const test of freeTests) {
        await runTest(test);
        await new Promise(r => setTimeout(r, 100)); // slight stagger
      }

      // Mark keyed tests based on whether keys are saved
      for (const test of TESTS.filter(t => t.needsKey)) {
        const key = getKey(test.keyRef);
        if (!key) setRowState(test.id, 'warn', 'Add your key above, then click Test');
      }
    }, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
