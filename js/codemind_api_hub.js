/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║            CodeMind — Unified API Hub & Coordinator                 ║
 * ║                                                                      ║
 * ║  Single file that wires, tests, monitors, and routes every           ║
 * ║  API the CodeMind app uses — keyed and free.                         ║
 * ║                                                                      ║
 * ║  Drop ONE script tag before </body>:                                 ║
 * ║    <script src="codemind_api_hub.js"></script>                       ║
 * ║                                                                      ║
 * ║  What this file does:                                                ║
 * ║  1. Declares every real API endpoint (no mocks, no placeholders)     ║
 * ║  2. Provides a universal `CM.api(name, params)` call with automatic  ║
 * ║     primary → fallback routing                                       ║
 * ║  3. Loads / saves API keys from localStorage                         ║
 * ║  4. Auto-injects keys into app globals (apiKey, judge0Key, ghToken)  ║
 * ║  5. Health-checks every API on load, re-tests on demand              ║
 * ║  6. Renders a dark floating panel showing live status                ║
 * ║  7. Broadcasts a window event 'cm:apisReady' when done               ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════
   *  §0  NAMESPACE
   * ═══════════════════════════════════════════════════════════════════ */
  const CM = window.CM || (window.CM = {});

  /* ═══════════════════════════════════════════════════════════════════
   *  §1  KEY STORE  (reads/writes the same localStorage keys the app uses)
   * ═══════════════════════════════════════════════════════════════════ */
  const KEY_STORE = {
    gemini: 'cm_gemini_key',
    judge0: 'cm_j0_key',
    github: 'cm_gh_token',
  };

  const Keys = {
    get: (k) => localStorage.getItem(KEY_STORE[k] || k) || '',
    set: (k, v) => localStorage.setItem(KEY_STORE[k] || k, v),
  };

  /* Inject keys into whatever globals the app already exposes */
  function injectAppGlobals() {
    const g = Keys.get('gemini');
    const j = Keys.get('judge0');
    const gh = Keys.get('github');
    if (g  && typeof window.apiKey    !== 'undefined') window.apiKey    = g;
    if (j  && typeof window.judge0Key !== 'undefined') window.judge0Key = j;
    if (gh && typeof window.ghToken   !== 'undefined') window.ghToken   = gh;
    if (typeof window.updateAPIStatus === 'function') window.updateAPIStatus();
  }

  /* ═══════════════════════════════════════════════════════════════════
   *  §2  API REGISTRY
   *      Each entry:
   *        id          – unique slug
   *        label       – display name
   *        group       – 'AI' | 'Code' | 'Packages' | 'Geo' | 'Data' | 'Dev'
   *        needsKey    – true if a stored key is required
   *        keyId       – key slot in KEY_STORE
   *        keyHint     – where to get the free key
   *        ping()      – returns { ok: bool, msg: string }
   *        call(p)     – makes a real API call; returns response data or throws
   * ═══════════════════════════════════════════════════════════════════ */
  const REGISTRY = [

    /* ─── AI ──────────────────────────────────────────────────────── */
    {
      id: 'gemini',
      label: 'Gemini AI',
      group: 'AI',
      needsKey: true,
      keyId: 'gemini',
      keyPlaceholder: 'AIza...',
      keyHint: 'console.cloud.google.com → APIs & Services → Credentials (free tier)',

      async ping(key) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: ok' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        });
        if (!r.ok) { const e = await r.json().catch(() => ({})); return { ok: false, msg: e?.error?.message || `HTTP ${r.status}` }; }
        const d = await r.json();
        const text = d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { ok: !!text, msg: text ? `✓ "${text.trim()}"` : 'Empty response' };
      },

      /** @param {{ systemPrompt, userPrompt, key }} p */
      async call({ systemPrompt = '', userPrompt, key }) {
        key = key || Keys.get('gemini');
        if (!key) throw new Error('Gemini key missing');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
        const contents = [];
        if (systemPrompt) contents.push({ role: 'user', parts: [{ text: systemPrompt }], /* acts as context */ });
        contents.push({ role: 'user', parts: [{ text: userPrompt }] });
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 2048 } }),
        });
        if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${r.status}`); }
        const d = await r.json();
        return { text: d?.candidates?.[0]?.content?.parts?.[0]?.text || '' };
      },
    },

    {
      id: 'pollinations_img',
      label: 'Pollinations AI Images',
      group: 'AI',
      needsKey: false,

      async ping() {
        /* Validate by requesting a tiny 32×32 image; just check the URL resolves (HEAD is allowed) */
        const r = await fetch('https://image.pollinations.ai/prompt/test?width=32&height=32&nologo=true', { method: 'HEAD' });
        return { ok: r.ok || r.status === 200, msg: r.ok ? '✓ Image generation available' : `HTTP ${r.status}` };
      },

      /** @param {{ prompt, style, width, height, seed }} p */
      call({ prompt, style = 'photorealistic', width = 512, height = 512, seed }) {
        seed = seed ?? Math.floor(Math.random() * 999999);
        const full = encodeURIComponent(`${prompt}, ${style}`);
        const url = `https://image.pollinations.ai/prompt/${full}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
        return { url, seed };   /* Caller renders <img src=url> — no fetch needed */
      },
    },

    {
      id: 'huggingface',
      label: 'Hugging Face Models',
      group: 'AI',
      needsKey: false,

      async ping() {
        const r = await fetch('https://huggingface.co/api/models?search=bert&limit=1');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: d.length > 0, msg: d.length ? `✓ ${d[0].modelId}` : 'No models' };
      },

      /** @param {{ query, limit }} p */
      async call({ query = 'bert', limit = 5 }) {
        const r = await fetch(`https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=${limit}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    /* ─── CODE EXECUTION ──────────────────────────────────────────── */
    {
      id: 'judge0',
      label: 'Judge0 Code Runner',
      group: 'Code',
      needsKey: true,
      keyId: 'judge0',
      keyPlaceholder: 'RapidAPI key...',
      keyHint: 'rapidapi.com → search "Judge0 CE" → subscribe free plan',

      async ping(key) {
        const sub = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=false', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com' },
          body: JSON.stringify({ language_id: 71, source_code: btoa('print("cm_ok")'), stdin: '' }),
        });
        if (!sub.ok) return { ok: false, msg: `Submit failed: HTTP ${sub.status}` };
        const { token } = await sub.json();
        if (!token) return { ok: false, msg: 'No token — key may be invalid' };
        await sleep(1500);
        const poll = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=true`, {
          headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com' },
        });
        if (!poll.ok) return { ok: false, msg: `Poll failed: HTTP ${poll.status}` };
        const res = await poll.json();
        const ok = res.status?.id >= 3;
        return { ok, msg: ok ? `✓ stdout: "${(res.stdout ? atob(res.stdout) : '').trim()}"` : `Queued (${res.status?.description})` };
      },

      /** @param {{ languageId, code, stdin, key }} p */
      async call({ languageId = 71, code, stdin = '', key }) {
        key = key || Keys.get('judge0');
        if (!key) throw new Error('Judge0 key missing');
        const hdrs = { 'Content-Type': 'application/json', 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com' };
        const sub = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=false', {
          method: 'POST', headers: hdrs,
          body: JSON.stringify({ language_id: languageId, source_code: btoa(unescape(encodeURIComponent(code))), stdin: btoa(stdin) }),
        });
        if (!sub.ok) throw new Error(`Submit HTTP ${sub.status}`);
        const { token } = await sub.json();
        /* Poll up to 10 s */
        for (let i = 0; i < 10; i++) {
          await sleep(1000);
          const poll = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=true`, { headers: hdrs });
          const res = await poll.json();
          if (res.status?.id >= 3) {
            return {
              stdout: res.stdout ? atob(res.stdout) : '',
              stderr: res.stderr ? atob(res.stderr) : '',
              compile_output: res.compile_output ? atob(res.compile_output) : '',
              status: res.status,
              time: res.time,
              memory: res.memory,
            };
          }
        }
        throw new Error('Timed out waiting for Judge0');
      },
    },

    /* ─── PACKAGES ────────────────────────────────────────────────── */
    {
      id: 'npm',
      label: 'npm Registry',
      group: 'Packages',
      needsKey: false,
      fallback: 'npms',

      async ping() {
        const r = await fetch('https://registry.npmjs.org/react');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.name, msg: `✓ react@${d['dist-tags']?.latest}` };
      },

      /** @param {{ name }} p  — fetch package info */
      async call({ name, action = 'info' }) {
        if (action === 'search') {
          const r = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(name)}&size=10`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }
        /* info */
        const r = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
        if (!r.ok) throw new Error(`Package "${name}" not found — HTTP ${r.status}`);
        const d = await r.json();
        /* Also fetch weekly downloads */
        let downloads = 'N/A';
        try {
          const dl = await fetch(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`);
          const dlData = await dl.json();
          if (dlData.downloads) downloads = dlData.downloads.toLocaleString();
        } catch (_) {}
        return { ...d, _weeklyDownloads: downloads };
      },
    },

    {
      id: 'npms',
      label: 'npms.io Search (fallback)',
      group: 'Packages',
      needsKey: false,

      async ping() {
        const r = await fetch('https://api.npms.io/v2/search?q=react&size=1');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.results?.length, msg: d.results?.length ? `✓ ${d.results[0].package.name}` : 'No results' };
      },

      async call({ name }) {
        const r = await fetch(`https://api.npms.io/v2/search?q=${encodeURIComponent(name)}&size=10`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'pypi',
      label: 'PyPI',
      group: 'Packages',
      needsKey: false,
      fallback: 'piwheels',

      async ping() {
        const r = await fetch('https://pypi.org/pypi/numpy/json');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.info?.version, msg: `✓ numpy ${d.info.version}` };
      },

      async call({ name }) {
        const r = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'piwheels',
      label: 'Piwheels (PyPI fallback)',
      group: 'Packages',
      needsKey: false,

      async ping() {
        const r = await fetch('https://www.piwheels.org/project/numpy/json');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.package, msg: d.package ? `✓ ${d.package} piwheels` : 'No metadata' };
      },

      async call({ name }) {
        const r = await fetch(`https://www.piwheels.org/project/${encodeURIComponent(name)}/json`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'crates',
      label: 'crates.io',
      group: 'Packages',
      needsKey: false,

      async ping() {
        const r = await fetch('https://crates.io/api/v1/crates/serde', { headers: { Accept: 'application/json' } });
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.crate?.newest_version, msg: `✓ serde ${d.crate.newest_version}` };
      },

      async call({ name }) {
        const r = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`, { headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    /* ─── SOURCE CONTROL ──────────────────────────────────────────── */
    {
      id: 'github',
      label: 'GitHub (authenticated)',
      group: 'Dev',
      needsKey: true,
      keyId: 'github',
      keyPlaceholder: 'ghp_...',
      keyHint: 'github.com → Settings → Developer settings → Personal access tokens → Fine-grained (free)',
      fallback: 'github_public',

      async ping(key) {
        const r = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${key}`, Accept: 'application/vnd.github+json' },
        });
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status} — invalid/expired` };
        const d = await r.json();
        return { ok: true, msg: `✓ @${d.login} · rate left: ${r.headers.get('X-RateLimit-Remaining') ?? '?'}` };
      },

      async call({ endpoint = '/user', method = 'GET', body, key }) {
        key = key || Keys.get('github');
        const opts = { method, headers: { Authorization: `Bearer ${key}`, Accept: 'application/vnd.github+json' } };
        if (body) { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
        const r = await fetch(`https://api.github.com${endpoint}`, opts);
        if (!r.ok) throw new Error(`GitHub ${method} ${endpoint} → HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'github_public',
      label: 'GitHub API (public)',
      group: 'Dev',
      needsKey: false,

      async ping() {
        const r = await fetch('https://api.github.com/repos/torvalds/linux', { headers: { Accept: 'application/vnd.github+json' } });
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.id, msg: `✓ Unauth · rate left: ${r.headers.get('X-RateLimit-Remaining') ?? '?'}` };
      },

      async call({ endpoint = '/repos/torvalds/linux', method = 'GET' }) {
        const r = await fetch(`https://api.github.com${endpoint}`, { method, headers: { Accept: 'application/vnd.github+json' } });
        if (!r.ok) throw new Error(`GitHub public ${endpoint} → HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'gitlab_public',
      label: 'GitLab Projects API',
      group: 'Dev',
      needsKey: false,

      async ping() {
        const r = await fetch('https://gitlab.com/api/v4/projects?search=javascript&per_page=1');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: d.length > 0, msg: d.length ? `✓ ${d[0].path_with_namespace}` : 'No projects' };
      },

      async call({ search = 'javascript', perPage = 10 }) {
        const r = await fetch(`https://gitlab.com/api/v4/projects?search=${encodeURIComponent(search)}&per_page=${perPage}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'gitignore',
      label: 'gitignore.io (Toptal)',
      group: 'Dev',
      needsKey: false,

      async ping() {
        const r = await fetch('https://www.toptal.com/developers/gitignore/api/python');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const t = await r.text();
        return { ok: t.includes('# Created by'), msg: '✓ .gitignore for Python' };
      },

      async call({ stacks = ['python'] }) {
        const query = stacks.map(encodeURIComponent).join(',');
        const r = await fetch(`https://www.toptal.com/developers/gitignore/api/${query}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      },
    },

    /* ─── DOCUMENTATION ───────────────────────────────────────────── */
    {
      id: 'mdn',
      label: 'MDN Docs Search',
      group: 'Dev',
      needsKey: false,

      async ping() {
        const r = await fetch('https://developer.mozilla.org/api/v1/search?q=array&locale=en-US');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.documents?.length, msg: `✓ ${d.count} results for "array"` };
      },

      async call({ query, locale = 'en-US' }) {
        const r = await fetch(`https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=${locale}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'caniuse',
      label: 'Can I Use data',
      group: 'Dev',
      needsKey: false,

      async ping() {
        const r = await fetch('https://raw.githubusercontent.com/Fyrd/caniuse/main/data.json');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.data?.fetch, msg: d.data?.fetch ? '✓ Browser support data loaded' : 'No fetch entry' };
      },

      async call() {
        const r = await fetch('https://raw.githubusercontent.com/Fyrd/caniuse/main/data.json');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    /* ─── RESEARCH & PAPERS ───────────────────────────────────────── */
    {
      id: 'arxiv',
      label: 'arXiv Papers',
      group: 'Data',
      needsKey: false,
      fallback: 'semanticscholar',

      async ping() {
        const r = await fetch('https://export.arxiv.org/api/query?search_query=all:transformer&max_results=1');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const t = await r.text();
        return { ok: t.includes('<entry>'), msg: t.includes('<entry>') ? '✓ arXiv returned results' : 'No entries' };
      },

      /** @param {{ query, maxResults }} p  — returns parsed XML as text */
      async call({ query, maxResults = 5 }) {
        const q = encodeURIComponent(query);
        const r = await fetch(`https://export.arxiv.org/api/query?search_query=all:${q}&max_results=${maxResults}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();   /* Caller may parse XML or display raw */
      },
    },

    {
      id: 'openalex',
      label: 'OpenAlex Papers',
      group: 'Data',
      needsKey: false,

      async ping() {
        const r = await fetch('https://api.openalex.org/works?search=attention&per-page=1');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.results?.length, msg: d.results?.length ? `✓ ${d.results[0].display_name.substring(0, 45)}…` : 'No results' };
      },

      async call({ query, perPage = 5 }) {
        const r = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${perPage}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'semanticscholar',
      label: 'Semantic Scholar',
      group: 'Data',
      needsKey: false,

      async ping() {
        const r = await fetch('https://api.semanticscholar.org/graph/v1/paper/search?query=attention&limit=1&fields=title');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.data?.length, msg: d.data?.length ? `✓ "${d.data[0].title?.substring(0, 40)}…"` : 'No results' };
      },

      async call({ query, limit = 5, fields = 'title,authors,year,abstract' }) {
        const r = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${fields}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    /* ─── GEO & LOCATION ──────────────────────────────────────────── */
    {
      id: 'openmeteo',
      label: 'Weather (Open-Meteo)',
      group: 'Geo',
      needsKey: false,
      fallback: 'wttr',

      async ping() {
        const geo = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=London&count=1&language=en&format=json');
        if (!geo.ok) return { ok: false, msg: `Geocoding HTTP ${geo.status}` };
        const g = await geo.json();
        const loc = g.results?.[0];
        if (!loc) return { ok: false, msg: 'Geocoding: no results' };
        const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`);
        if (!wx.ok) return { ok: false, msg: `Forecast HTTP ${wx.status}` };
        const w = await wx.json();
        const temp = w.current_weather?.temperature;
        return { ok: temp !== undefined, msg: `✓ London: ${temp}°C` };
      },

      async call({ city, lat, lon }) {
        /* Resolve city → coords if lat/lon not provided */
        if (!lat || !lon) {
          const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
          if (!geo.ok) throw new Error(`Geocoding HTTP ${geo.status}`);
          const g = await geo.json();
          const loc = g.results?.[0];
          if (!loc) throw new Error(`City "${city}" not found`);
          lat = loc.latitude; lon = loc.longitude;
        }
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m`);
        if (!r.ok) throw new Error(`Forecast HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'wttr',
      label: 'Weather backup (wttr.in)',
      group: 'Geo',
      needsKey: false,

      async ping() {
        const r = await fetch('https://wttr.in/London?format=j1');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.current_condition?.[0]?.temp_C, msg: `✓ London backup: ${d.current_condition[0].temp_C}°C` };
      },

      async call({ city }) {
        const r = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'nominatim',
      label: 'Geocoding (Nominatim/OSM)',
      group: 'Geo',
      needsKey: false,

      async ping() {
        const r = await fetch('https://nominatim.openstreetmap.org/search?q=London&format=json&limit=1', { headers: { Accept: 'application/json' } });
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: d.length > 0, msg: d.length ? `✓ ${d[0].display_name.substring(0, 42)}…` : 'No results' };
      },

      async call({ query, limit = 5 }) {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}`, { headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'ipapi',
      label: 'IP Geolocation (ipapi.co)',
      group: 'Geo',
      needsKey: false,
      fallback: 'ipwhois',

      async ping() {
        const r = await fetch('https://ipapi.co/json/');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.ip, msg: d.reserved ? '✓ Reachable (private IP)' : `✓ ${d.ip} · ${d.city}, ${d.country_name}` };
      },

      async call({ ip = '' } = {}) {
        const r = await fetch(`https://ipapi.co/${ip ? ip + '/' : ''}json/`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'ipwhois',
      label: 'IP Geolocation backup (ipwho.is)',
      group: 'Geo',
      needsKey: false,

      async ping() {
        const r = await fetch('https://ipwho.is/');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: d.success !== false && !!d.ip, msg: `✓ IP backup: ${d.ip}` };
      },

      async call({ ip = '' } = {}) {
        const r = await fetch(`https://ipwho.is/${ip}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'restcountries',
      label: 'REST Countries',
      group: 'Geo',
      needsKey: false,
      fallback: 'worldbank',

      async ping() {
        const r = await fetch('https://restcountries.com/v3.1/name/Germany?fullText=true');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: d[0]?.name?.common === 'Germany', msg: `✓ Germany · capital: ${d[0]?.capital?.[0]}` };
      },

      async call({ name, code }) {
        const endpoint = code ? `alpha/${code}` : `name/${encodeURIComponent(name)}`;
        const r = await fetch(`https://restcountries.com/v3.1/${endpoint}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'worldbank',
      label: 'World Bank (country fallback)',
      group: 'Geo',
      needsKey: false,

      async ping() {
        const r = await fetch('https://api.worldbank.org/v2/country/DE?format=json');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d?.[1]?.[0]?.name, msg: `✓ ${d[1][0].name}` };
      },

      async call({ code }) {
        const r = await fetch(`https://api.worldbank.org/v2/country/${code}?format=json`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    /* ─── DATA & FINANCE ──────────────────────────────────────────── */
    {
      id: 'openexchange',
      label: 'Exchange Rates (open.er-api)',
      group: 'Data',
      needsKey: false,
      fallback: 'frankfurter',

      async ping() {
        const r = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: d.result === 'success', msg: d.result === 'success' ? `✓ USD→INR: ${d.rates?.INR?.toFixed(2)}` : d['error-type'] };
      },

      async call({ base = 'USD' } = {}) {
        const r = await fetch(`https://open.er-api.com/v6/latest/${base}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'frankfurter',
      label: 'Exchange Rates backup (Frankfurter)',
      group: 'Data',
      needsKey: false,

      async ping() {
        const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.rates?.INR, msg: `✓ USD→INR: ${d.rates.INR?.toFixed(2)}` };
      },

      async call({ from = 'USD', to = 'EUR' } = {}) {
        const r = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'hacknews',
      label: 'Hacker News',
      group: 'Data',
      needsKey: false,
      fallback: 'lobsters',

      async ping() {
        const r = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const ids = await r.json();
        return { ok: Array.isArray(ids) && ids.length > 0, msg: `✓ ${ids.length} stories` };
      },

      async call({ limit = 10 } = {}) {
        const r = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const ids = await r.json();
        return Promise.all(ids.slice(0, limit).map(id =>
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(x => x.json())
        ));
      },
    },

    {
      id: 'lobsters',
      label: 'Tech News backup (Lobsters)',
      group: 'Data',
      needsKey: false,

      async ping() {
        const r = await fetch('https://lobste.rs/hottest.json');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: d.length > 0, msg: `✓ ${d.length} tech stories` };
      },

      async call() {
        const r = await fetch('https://lobste.rs/hottest.json');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    /* ─── TRANSLATION ─────────────────────────────────────────────── */
    {
      id: 'mymemory',
      label: 'MyMemory Translate',
      group: 'Data',
      needsKey: false,
      fallback: 'lingva',

      async ping() {
        const r = await fetch('https://api.mymemory.translated.net/get?q=Hello+world&langpair=en|es');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.responseData?.translatedText, msg: `✓ "Hello world" → "${d.responseData?.translatedText}"` };
      },

      async call({ text, from = 'en', to = 'es' }) {
        const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        if (d.responseStatus !== 200) throw new Error(d.responseDetails || 'MyMemory failed');
        return d;
      },
    },

    {
      id: 'lingva',
      label: 'Translate backup (Lingva)',
      group: 'Data',
      needsKey: false,

      async ping() {
        const r = await fetch('https://lingva.ml/api/v1/en/es/Hello%20world');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.translation, msg: `✓ "${d.translation}"` };
      },

      async call({ text, from = 'en', to = 'es' }) {
        const r = await fetch(`https://lingva.ml/api/v1/${from}/${to}/${encodeURIComponent(text)}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    /* ─── MISC DEV TOOLS ──────────────────────────────────────────── */
    {
      id: 'thecolorapi',
      label: 'The Color API',
      group: 'Dev',
      needsKey: false,
      fallback: 'colorpizza',

      async ping() {
        const r = await fetch('https://www.thecolorapi.com/id?hex=00e5ff&format=json');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.name?.value, msg: `✓ #00e5ff = "${d.name.value}"` };
      },

      async call({ hex }) {
        const r = await fetch(`https://www.thecolorapi.com/id?hex=${hex.replace('#', '')}&format=json`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'colorpizza',
      label: 'Color names backup (Color.pizza)',
      group: 'Dev',
      needsKey: false,

      async ping() {
        const r = await fetch('https://api.color.pizza/v1/00e5ff');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.colors?.[0]?.name, msg: `✓ #00e5ff = "${d.colors[0].name}"` };
      },

      async call({ hex }) {
        const r = await fetch(`https://api.color.pizza/v1/${hex.replace('#', '')}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'jokeapi',
      label: 'JokeAPI (Dev jokes)',
      group: 'Dev',
      needsKey: false,

      async ping() {
        const r = await fetch('https://v2.jokeapi.dev/joke/Programming?safe-mode');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !d.error, msg: d.error ? d.message : `✓ ${d.type} joke (${d.category})` };
      },

      async call({ category = 'Programming', safe = true } = {}) {
        const r = await fetch(`https://v2.jokeapi.dev/joke/${category}${safe ? '?safe-mode' : ''}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'exercism',
      label: 'Exercism API',
      group: 'Dev',
      needsKey: false,

      async ping() {
        const r = await fetch('https://exercism.org/api/v2/exercises?track_slug=python&per_page=1', { headers: { Accept: 'application/json' } });
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: !!d.exercises?.length, msg: d.exercises?.length ? `✓ First: "${d.exercises[0].slug}"` : 'No exercises' };
      },

      async call({ track = 'python', perPage = 20 } = {}) {
        const r = await fetch(`https://exercism.org/api/v2/exercises?track_slug=${track}&per_page=${perPage}`, { headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'leetcode',
      label: 'LeetCode Stats API',
      group: 'Dev',
      needsKey: false,

      async ping() {
        const r = await fetch('https://alfa-leetcode-api.onrender.com/userDetails/neal_wu');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status} (may be slow – cold start)` };
        const d = await r.json();
        return { ok: !!d.username, msg: `✓ ${d.username} · solved: ${d.totalSolved ?? '?'}` };
      },

      async call({ username }) {
        const r = await fetch(`https://alfa-leetcode-api.onrender.com/userDetails/${encodeURIComponent(username)}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      },
    },

    {
      id: 'dictionary',
      label: 'Free Dictionary API',
      group: 'Data',
      needsKey: false,
      async ping() {
        const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/hello');
        if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
        const d = await r.json();
        return { ok: Array.isArray(d) && d.length > 0, msg: `✓ hello = "${d[0]?.meanings?.[0]?.definitions?.[0]?.definition || ''}"` };
      },
      async call({ word }) {
        const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }
    },

  ]; // end REGISTRY

  /* Build a quick lookup map */
  const API = {};
  REGISTRY.forEach(e => (API[e.id] = e));

  /* ═══════════════════════════════════════════════════════════════════
   *  §3  UNIVERSAL CALL WITH AUTO-FALLBACK
   *
   *  Usage:
   *    const data = await CM.api('npm', { name: 'react' });
   *    const data = await CM.api('openmeteo', { city: 'Tokyo' });
   *    const { text } = await CM.api('gemini', { userPrompt: 'Hello!' });
   * ═══════════════════════════════════════════════════════════════════ */
  CM.api = async function (id, params = {}) {
    const entry = API[id];
    if (!entry) throw new Error(`CM.api: unknown API "${id}"`);
    try {
      return await entry.call(params);
    } catch (err) {
      if (entry.fallback && API[entry.fallback]) {
        console.warn(`[CM] ${id} failed (${err.message}), trying fallback: ${entry.fallback}`);
        return API[entry.fallback].call(params);
      }
      throw err;
    }
  };

  /* Expose the full registry and key helpers too */
  CM.registry = REGISTRY;
  CM.keys = Keys;
  CM.apiMap = API;

  /* ═══════════════════════════════════════════════════════════════════
   *  §4  HEALTH CHECK ENGINE
   *      Runs pings concurrently (keyed APIs only if key is present)
   *      Stores results in CM.health = { [id]: { ok, msg, ms } }
   * ═══════════════════════════════════════════════════════════════════ */
  CM.health = {};

  CM.runHealthChecks = async function (onUpdate) {
    const jobs = REGISTRY.map(async (entry) => {
      const key = entry.needsKey ? Keys.get(entry.keyId) : null;
      if (entry.needsKey && !key) {
        CM.health[entry.id] = { ok: null, msg: 'Key not set', ms: null };
        onUpdate?.(entry.id, CM.health[entry.id]);
        return;
      }
      const t0 = Date.now();
      try {
        const result = await entry.ping(key);
        CM.health[entry.id] = { ...result, ms: Date.now() - t0 };
      } catch (e) {
        CM.health[entry.id] = { ok: false, msg: e.message || 'Error', ms: Date.now() - t0 };
      }
      onUpdate?.(entry.id, CM.health[entry.id]);
    });
    await Promise.allSettled(jobs);
    window.dispatchEvent(new CustomEvent('cm:apisReady', { detail: CM.health }));
    return CM.health;
  };

  /* ═══════════════════════════════════════════════════════════════════
   *  §5  PANEL UI
   * ═══════════════════════════════════════════════════════════════════ */

  function buildPanel() {
    if (document.getElementById('cm_hub_panel')) return;

    const GROUPS = ['AI', 'Code', 'Packages', 'Dev', 'Geo', 'Data'];

    /* ── Styles ── */
    const style = document.createElement('style');
    style.textContent = `
      #cm_hub_panel {
        position: fixed; bottom: 18px; right: 18px; z-index: 2147483647;
        width: 420px; max-height: 88vh;
        background: #0b0b13; border: 1px solid #1f1f30;
        border-radius: 16px; overflow: hidden;
        box-shadow: 0 24px 64px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.04);
        font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
        display: flex; flex-direction: column;
        transition: max-height .25s cubic-bezier(.4,0,.2,1);
      }
      #cm_hub_panel.cm_collapsed { max-height: 50px; }
      #cm_hub_header {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 16px; background: #0f0f1a;
        border-bottom: 1px solid #1f1f30; cursor: pointer;
        user-select: none; flex-shrink: 0;
      }
      #cm_hub_header .cm_logo {
        width: 22px; height: 22px; border-radius: 6px;
        background: linear-gradient(135deg, #00e5ff, #7c3aed);
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; flex-shrink: 0;
      }
      #cm_hub_header h3 {
        font-size: 11px; font-weight: 800; letter-spacing: 1.5px;
        text-transform: uppercase; color: #e8e8f4; margin: 0; flex: 1;
      }
      #cm_hub_score { font-size: 10px; color: #6b6b80; }
      #cm_hub_chevron { font-size: 11px; color: #4a4a60; transition: transform .25s; }
      #cm_hub_panel.cm_collapsed #cm_hub_chevron { transform: rotate(180deg); }

      #cm_hub_body { overflow-y: auto; flex: 1; padding: 12px 10px; scrollbar-width: thin; scrollbar-color: #2a2a3a transparent; }

      .cm_group_label {
        font-size: 9px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase;
        color: #4a4a60; margin: 10px 2px 6px; display: flex; align-items: center; gap: 8px;
      }
      .cm_group_label::after { content: ''; flex: 1; height: 1px; background: #1a1a28; }

      .cm_row {
        display: flex; align-items: center; gap: 8px;
        padding: 7px 10px; margin-bottom: 3px;
        border-radius: 9px; background: #111120; border: 1px solid #1a1a2a;
        transition: border-color .15s, background .15s;
      }
      .cm_row:hover { border-color: #2e2e50; background: #14142a; }
      .cm_row.cm_has_key { border-left: 3px solid #7c3aed; }

      .cm_dot {
        width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
        background: #2a2a3a; transition: background .3s;
      }
      .cm_dot.ok   { background: #10b981; box-shadow: 0 0 6px #10b981aa; }
      .cm_dot.fail { background: #ef4444; box-shadow: 0 0 6px #ef4444aa; }
      .cm_dot.warn { background: #f59e0b; box-shadow: 0 0 6px #f59e0baa; }
      .cm_dot.pend { background: #2a2a3a; animation: cm_pulse 1.2s infinite; }
      @keyframes cm_pulse { 0%,100%{opacity:1} 50%{opacity:.25} }

      .cm_name { font-size: 11px; color: #c8c8e0; font-weight: 700; width: 155px; flex-shrink: 0; }
      .cm_msg  { font-size: 10px; color: #52527a; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cm_ms   { font-size: 9px; color: #3a3a5a; flex-shrink: 0; width: 38px; text-align: right; }

      /* key input blocks */
      .cm_key_block {
        background: #090911; border: 1px solid #1f1f30; border-radius: 8px;
        padding: 8px 10px; margin-bottom: 3px; display: none;
      }
      .cm_key_block.open { display: block; }
      .cm_key_block label { display: block; font-size: 9px; font-weight: 700; color: #4a4a60; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 5px; }
      .cm_key_block .cm_hint { font-size: 9px; color: #3a3a5a; margin-top: 4px; }
      .cm_key_row { display: flex; gap: 5px; }
      .cm_key_row input {
        flex: 1; background: #13131f; border: 1px solid #252535;
        border-radius: 6px; color: #e0e0f0; font-family: inherit;
        font-size: 11px; padding: 6px 10px; outline: none;
        transition: border-color .15s;
      }
      .cm_key_row input:focus { border-color: #7c3aed; }
      .cm_key_row input::placeholder { color: #2a2a3a; }
      .cm_btn_save {
        background: #7c3aed; border: none; border-radius: 6px; color: #fff;
        font-family: inherit; font-size: 10px; font-weight: 700;
        padding: 6px 12px; cursor: pointer; transition: background .15s;
      }
      .cm_btn_save:hover { background: #6d28d9; }

      /* footer */
      #cm_hub_footer {
        padding: 8px 12px; background: #0a0a14;
        border-top: 1px solid #1a1a28; flex-shrink: 0;
        display: flex; align-items: center; gap: 8px;
      }
      #cm_hub_retest {
        flex: 1; background: #1a1a2a; border: 1px solid #2a2a40;
        border-radius: 7px; color: #8080b0; font-family: inherit;
        font-size: 10px; font-weight: 700; padding: 6px 12px;
        cursor: pointer; transition: background .15s, color .15s;
        letter-spacing: .5px; text-transform: uppercase;
      }
      #cm_hub_retest:hover { background: #22223a; color: #a0a0cc; }
      #cm_hub_legend { display: flex; gap: 8px; font-size: 9px; color: #3a3a5a; align-items: center; }
      #cm_hub_legend span { display: flex; align-items: center; gap: 3px; }
    `;
    document.head.appendChild(style);

    /* ── Panel skeleton ── */
    const panel = document.createElement('div');
    panel.id = 'cm_hub_panel';
    panel.innerHTML = `
      <div id="cm_hub_header">
        <div class="cm_logo">⚡</div>
        <h3>API Hub</h3>
        <span id="cm_hub_score">—</span>
        <span id="cm_hub_chevron">▲</span>
      </div>
      <div id="cm_hub_body"></div>
      <div id="cm_hub_footer">
        <button id="cm_hub_retest">↺ Re-test all</button>
        <div id="cm_hub_legend">
          <span><i class="cm_dot ok"></i> Pass</span>
          <span><i class="cm_dot fail"></i> Fail</span>
          <span><i class="cm_dot warn" style="background:#f59e0b"></i> Key needed</span>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    /* Toggle collapse */
    document.getElementById('cm_hub_header').addEventListener('click', () => {
      panel.classList.toggle('cm_collapsed');
    });

    /* Build rows per group */
    const body = document.getElementById('cm_hub_body');

    GROUPS.forEach(grp => {
      const entries = REGISTRY.filter(e => e.group === grp);
      if (!entries.length) return;

      const label = document.createElement('div');
      label.className = 'cm_group_label';
      label.textContent = grp;
      body.appendChild(label);

      entries.forEach(entry => {
        /* Status row */
        const row = document.createElement('div');
        row.className = 'cm_row' + (entry.needsKey ? ' cm_has_key' : '');
        row.id = `cm_row_${entry.id}`;
        row.innerHTML = `
          <div class="cm_dot pend" id="cm_dot_${entry.id}"></div>
          <div class="cm_name">${entry.label}</div>
          <div class="cm_msg" id="cm_msg_${entry.id}">…</div>
          <div class="cm_ms" id="cm_ms_${entry.id}"></div>
        `;
        body.appendChild(row);

        /* Key input block (keyed APIs only) */
        if (entry.needsKey) {
          const block = document.createElement('div');
          block.className = 'cm_key_block';
          block.id = `cm_key_${entry.id}`;
          block.innerHTML = `
            <label>${entry.label} Key</label>
            <div class="cm_key_row">
              <input type="password" id="cm_input_${entry.id}" placeholder="${entry.keyPlaceholder}" value="${Keys.get(entry.keyId)}">
              <button class="cm_btn_save" data-id="${entry.id}">Save</button>
            </div>
            <div class="cm_hint">💡 ${entry.keyHint}</div>
          `;
          body.appendChild(block);

          /* Toggle key block on row click */
          row.style.cursor = 'pointer';
          row.addEventListener('click', () => {
            block.classList.toggle('open');
          });

          /* Save key */
          block.querySelector('.cm_btn_save').addEventListener('click', (e) => {
            const val = document.getElementById(`cm_input_${entry.id}`).value.trim();
            if (val) {
              Keys.set(entry.keyId, val);
              injectAppGlobals();
              block.classList.remove('open');
              pingOne(entry);
            }
          });
        }
      });
    });

    /* Re-test button */
    document.getElementById('cm_hub_retest').addEventListener('click', () => {
      runAndRender();
    });
  }

  /* ── Update a single row in the panel ── */
  function updateRow(id, result) {
    const dot = document.getElementById(`cm_dot_${id}`);
    const msg = document.getElementById(`cm_msg_${id}`);
    const ms  = document.getElementById(`cm_ms_${id}`);
    if (!dot) return;

    dot.className = 'cm_dot';
    if (result.ok === null) {
      dot.classList.add('warn');
      if (msg) msg.textContent = result.msg;
      if (msg) msg.style.color = '#f59e0b';
    } else if (result.ok) {
      dot.classList.add('ok');
      if (msg) { msg.textContent = result.msg; msg.style.color = '#10b981'; }
    } else {
      dot.classList.add('fail');
      if (msg) { msg.textContent = result.msg; msg.style.color = '#ef4444'; }
    }
    if (ms && result.ms !== null) ms.textContent = `${result.ms}ms`;
  }

  /* ── Update the header score ── */
  function updateScore() {
    const vals = Object.values(CM.health);
    const pass = vals.filter(v => v.ok === true).length;
    const total = vals.length;
    const el = document.getElementById('cm_hub_score');
    if (el) {
      el.textContent = `${pass}/${total} OK`;
      el.style.color = pass === total ? '#10b981' : pass > total / 2 ? '#f59e0b' : '#ef4444';
    }
  }

  /* ── Ping one entry and update row ── */
  async function pingOne(entry) {
    const key = entry.needsKey ? Keys.get(entry.keyId) : null;
    const dot = document.getElementById(`cm_dot_${entry.id}`);
    if (dot) { dot.className = 'cm_dot pend'; }
    const t0 = Date.now();
    try {
      const result = await entry.ping(key);
      CM.health[entry.id] = { ...result, ms: Date.now() - t0 };
    } catch (e) {
      CM.health[entry.id] = { ok: false, msg: e.message, ms: Date.now() - t0 };
    }
    updateRow(entry.id, CM.health[entry.id]);
    updateScore();
  }

  /* ── Run all checks and update UI ── */
  function runAndRender() {
    /* Reset dots */
    REGISTRY.forEach(e => {
      const dot = document.getElementById(`cm_dot_${e.id}`);
      if (dot) { dot.className = 'cm_dot pend'; }
      const msg = document.getElementById(`cm_msg_${e.id}`);
      if (msg) { msg.textContent = '…'; msg.style.color = ''; }
    });
    CM.runHealthChecks((id, result) => {
      updateRow(id, result);
      updateScore();
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
   *  §6  BOOTSTRAP
   * ═══════════════════════════════════════════════════════════════════ */
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  window.sleep = window.sleep || sleep;   /* share with other CM scripts */

  function init() {
    injectAppGlobals();
    buildPanel();
    /* Small delay so the page is visible before we start network calls */
    setTimeout(runAndRender, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Expose public surface */
  CM.retest = runAndRender;

})(); // end IIFE
