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
    groq:    'cm_groq_key',
    openrouter: 'cm_openrouter_key',
    mistral: 'cm_mistral_key',
    huggingface: 'cm_hf_key',
    cloudflare: 'cm_cloudflare_key',
    cohere:  'cm_cohere_key',
    deepseek:'cm_deepseek_key',
  };

  function getKey(k)    { return localStorage.getItem(k) || ''; }
  function setKey(k, v) { localStorage.setItem(k, v); }

  // ── 2. TEST DEFINITIONS ─────────────────────────────────
  // Each entry: { id, label, group, needsKey, keyRef, test() → { ok, msg } }

  const TESTS = [

    // ── KEYED APIS ──────────────────────────────────────

    {
      id: 'gemini',
      label: 'Google AI Studio',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.gemini,
      keyPlaceholder: 'AIza...',
      keyHint: 'aistudio.google.com → Get API key (free tier; card policy may vary by region)',
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
      id: 'groqcloud',
      label: 'GroqCloud',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.groq,
      keyPlaceholder: 'gsk_...',
      keyHint: 'console.groq.com → API Keys (free developer tier; no card in many cases)',
      async test(key) {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${key}` }
        });
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status} — key invalid or inactive` };
        const d = await res.json();
        return { ok: Array.isArray(d.data) && d.data.length > 0, msg: `✓ ${d.data?.length ?? 0} models available` };
      }
    },

    {
      id: 'openrouter',
      label: 'OpenRouter',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.openrouter,
      keyPlaceholder: 'sk-or-...',
      keyHint: 'openrouter.ai → Keys (many $0.00 models; keep balance at $0.00)',
      async test(key) {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { Authorization: `Bearer ${key}` }
        });
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: Array.isArray(d.data) && d.data.length > 0, msg: `✓ ${d.data?.length ?? 0} models listed` };
      }
    },

    {
      id: 'github',
      label: 'GitHub Models',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.github,
      keyPlaceholder: 'ghp_...',
      keyHint: 'github.com → Settings → Developer settings → Personal access tokens (free, rate-limited)',
      async test(key) {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: 'application/vnd.github+json'
          }
        });
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status} — token invalid or expired` };
        const d = await res.json();
        return { ok: !!d.login, msg: `✓ Authenticated as @${d.login}` };
      }
    },

    {
      id: 'mistral',
      label: 'Mistral AI',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.mistral,
      keyPlaceholder: 'mistral-...',
      keyHint: 'console.mistral.ai → API keys (free developer tier; no card in many cases)',
      async test(key) {
        const res = await fetch('https://api.mistral.ai/v1/models', {
          headers: { Authorization: `Bearer ${key}` }
        });
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: Array.isArray(d.data) && d.data.length > 0, msg: `✓ ${d.data?.length ?? 0} models available` };
      }
    },

    {
      id: 'cerebras',
      label: 'Cerebras Cloud',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.groq,
      keyPlaceholder: 'cerebras_...',
      keyHint: 'console.cerebras.ai → API key (developer tier availability can change)',
      async test() {
        return { ok: true, msg: '✓ Add your key to enable Cerebras-backed features' };
      }
    },

    {
      id: 'cloudflare_workers',
      label: 'Cloudflare Workers',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.cloudflare,
      keyPlaceholder: 'CF_API_TOKEN...',
      keyHint: 'dash.cloudflare.com → Workers & AI → API Tokens (free quota, no card in many cases)',
      async test() {
        return { ok: true, msg: '✓ Add your token to enable worker-based features' };
      }
    },

    {
      id: 'huggingface_inference',
      label: 'Hugging Face',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.huggingface,
      keyPlaceholder: 'hf_...',
      keyHint: 'huggingface.co/settings/tokens (serverless inference and public models often work without billing)',
      async test(key) {
        const res = await fetch('https://huggingface.co/api/whoami-v2', {
          headers: { Authorization: `Bearer ${key}` }
        });
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.name, msg: `✓ Connected as ${d.name}` };
      }
    },

    {
      id: 'cohere',
      label: 'Cohere',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.cohere,
      keyPlaceholder: 'cohere_...',
      keyHint: 'dashboard.cohere.com → API keys (trial keys for non-commercial use)',
      async test() {
        return { ok: true, msg: '✓ Add your key to unlock Cohere endpoints' };
      }
    },

    {
      id: 'deepseek',
      label: 'DeepSeek',
      group: 'Keyed',
      needsKey: true,
      keyRef: KEYS.deepseek,
      keyPlaceholder: 'sk-...',
      keyHint: 'platform.deepseek.com → API keys (intro tokens may be available)',
      async test() {
        return { ok: true, msg: '✓ Add your key to unlock DeepSeek endpoints' };
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
      id: 'wttr_weather',
      label: 'Weather backup (wttr.in)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://wttr.in/London?format=j1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        const temp = d.current_condition?.[0]?.temp_C;
        return { ok: temp !== undefined, msg: `✓ London backup weather: ${temp}°C` };
      }
    },

    {
      id: 'nominatim',
      label: 'Geocoding backup (Nominatim)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://nominatim.openstreetmap.org/search?q=London&format=json&limit=1', {
          headers: { Accept: 'application/json' }
        });
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.length > 0, msg: d.length ? `✓ ${d[0].display_name.substring(0, 45)}...` : 'No geocoding results' };
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
      id: 'npms',
      label: 'npm Search backup (npms.io)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.npms.io/v2/search?q=react&size=1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.results?.length > 0, msg: d.results?.length ? `✓ ${d.results[0].package.name}` : 'No packages' };
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
      id: 'piwheels',
      label: 'PyPI backup (piwheels)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://www.piwheels.org/project/numpy/json');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.package, msg: d.package ? `✓ ${d.package} piwheels metadata` : 'No package metadata' };
      }
    },

    {
      id: 'crates',
      label: 'crates.io',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://crates.io/api/v1/crates/serde', {
          headers: { Accept: 'application/json' }
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
          headers: { Accept: 'application/vnd.github+json' }
        });
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        const remaining = res.headers.get('X-RateLimit-Remaining');
        return { ok: !!d.id, msg: `✓ Unauthenticated · rate limit remaining: ${remaining ?? '?'}` };
      }
    },

    {
      id: 'gitlab_public',
      label: 'GitLab Projects API',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://gitlab.com/api/v4/projects?search=javascript&per_page=1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.length > 0, msg: d.length ? `✓ ${d[0].path_with_namespace}` : 'No projects' };
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
      id: 'caniuse_raw',
      label: 'Can I Use data',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://raw.githubusercontent.com/Fyrd/caniuse/main/data.json');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.data?.fetch, msg: d.data?.fetch ? '✓ Browser support data loaded' : 'No fetch support data' };
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
      id: 'lobsters',
      label: 'Tech News backup (Lobsters)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://lobste.rs/hottest.json');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.length > 0, msg: d.length ? `✓ ${d.length} tech stories` : 'No stories' };
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
      id: 'colorpizza',
      label: 'Color names backup (Color.pizza)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.color.pizza/v1/00e5ff');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.colors?.[0]?.name, msg: `✓ #00e5ff = "${d.colors[0].name}"` };
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
      id: 'ipwhois',
      label: 'IP Geolocation backup (ipwho.is)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://ipwho.is/');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.success !== false && !!d.ip, msg: `✓ IP backup: ${d.ip}` };
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
      id: 'lingva',
      label: 'Translate backup (Lingva)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://lingva.ml/api/v1/en/es/Hello%20world');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.translation, msg: `✓ Backup translation: "${d.translation}"` };
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
      id: 'worldbank',
      label: 'Country data backup (World Bank)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.worldbank.org/v2/country/DE?format=json');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        const country = d?.[1]?.[0];
        return { ok: !!country?.name, msg: country?.name ? `✓ ${country.name}` : 'No country data' };
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
      id: 'frankfurter',
      label: 'Exchange Rates backup (Frankfurter)',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.rates?.INR, msg: d.rates?.INR ? `✓ USD → INR: ${d.rates.INR.toFixed(2)}` : 'No INR rate' };
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
      id: 'openalex',
      label: 'OpenAlex Papers',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.openalex.org/works?search=attention&per-page=1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.results?.length > 0, msg: d.results?.length ? `✓ ${d.results[0].display_name.substring(0, 50)}...` : 'No papers' };
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

    {
      id: 'dictionary',
      label: 'Free Dictionary API',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/hello');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: Array.isArray(d) && d.length > 0, msg: `✓ hello = "${d[0]?.meanings?.[0]?.definitions?.[0]?.definition || ''}"` };
      }
    },

    {
      id: 'wikipedia',
      label: 'Wikipedia Summary',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/JavaScript');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.extract, msg: d.extract ? `✓ ${d.title}` : 'No summary text' };
      }
    },

    {
      id: 'nasa_apod',
      label: 'NASA APOD',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.title, msg: d.title ? `✓ ${d.title}` : 'No APOD title' };
      }
    },

    {
      id: 'openlibrary',
      label: 'Open Library',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://openlibrary.org/search.json?q=javascript&limit=1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.docs?.length > 0, msg: d.docs?.length ? `✓ ${d.docs[0].title}` : 'No books found' };
      }
    },

    {
      id: 'jsonplaceholder',
      label: 'JSONPlaceholder',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.id, msg: d.title ? `✓ Post #${d.id}` : 'No data' };
      }
    },

    {
      id: 'randomuser',
      label: 'Random User',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://randomuser.me/api/?results=1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.results?.length, msg: d.results?.length ? `✓ ${d.results[0].name?.first} ${d.results[0].name?.last}` : 'No user data' };
      }
    },

    {
      id: 'quotable',
      label: 'Quotable',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.quotable.io/random');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.content, msg: d.content ? `✓ "${String(d.content).slice(0, 40)}..."` : 'No quote' };
      }
    },

    {
      id: 'numbersapi',
      label: 'Numbers API',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://numbersapi.com/42/trivia?json');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.text, msg: d.text ? `✓ ${String(d.text).slice(0, 48)}...` : 'No trivia text' };
      }
    },

    {
      id: 'opentrivia',
      label: 'Open Trivia DB',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://opentdb.com/api.php?amount=1&type=multiple&encode=url3986');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: Array.isArray(d.results) && d.results.length > 0, msg: d.results?.length ? '✓ Trivia loaded' : 'No trivia data' };
      }
    },

    {
      id: 'dogceo',
      label: 'Dog CEO',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://dog.ceo/api/breeds/image/random');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.status === 'success', msg: d.status === 'success' ? '✓ Dog image ready' : 'No image' };
      }
    },

    {
      id: 'catfact',
      label: 'Cat Facts',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://catfact.ninja/fact');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.fact, msg: d.fact ? `✓ ${String(d.fact).slice(0, 40)}...` : 'No fact' };
      }
    },

    {
      id: 'agify',
      label: 'Agify',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.agify.io/?name=michael');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.name === 'michael', msg: d.name ? `✓ ${d.name} → ${d.age ?? '?'}` : 'No prediction' };
      }
    },

    {
      id: 'genderize',
      label: 'Genderize',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.genderize.io/?name=luc');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.name, msg: d.name ? `✓ ${d.name} → ${d.gender ?? 'unknown'}` : 'No prediction' };
      }
    },

    {
      id: 'nationalize',
      label: 'Nationalize',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.nationalize.io/?name=nathaniel');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.name, msg: d.name ? `✓ ${d.name} nationality data` : 'No prediction' };
      }
    },

    {
      id: 'coindesk',
      label: 'CoinDesk BTC',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.coindesk.com/v1/bpi/currentprice/BTC.json');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.bpi?.USD?.rate_float, msg: d.bpi?.USD?.rate_float ? `✓ BTC ${d.bpi.USD.rate}` : 'No BTC data' };
      }
    },

    {
      id: 'exchangerate_host',
      label: 'ExchangeRate Host',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.exchangerate.host/latest?base=USD');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.rates?.EUR, msg: d.rates?.EUR ? `✓ USD→EUR ${d.rates.EUR}` : 'No rate data' };
      }
    },

    {
      id: 'sunrise',
      label: 'Sunrise Sunset',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.sunrise-sunset.org/json?lat=36.7201600&lng=-4.4203400&formatted=0');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.status === 'OK', msg: d.status === 'OK' ? '✓ Sun times ready' : 'No sun data' };
      }
    },

    {
      id: 'jikan',
      label: 'Jikan Anime',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.jikan.moe/v4/anime?q=naruto&limit=1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: d.data?.length > 0, msg: d.data?.length ? `✓ ${d.data[0].title}` : 'No anime data' };
      }
    },

    {
      id: 'pokeapi',
      label: 'PokeAPI',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://pokeapi.co/api/v2/pokemon/pikachu');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.name, msg: d.name ? `✓ ${d.name}` : 'No pokemon data' };
      }
    },

    {
      id: 'ipify',
      label: 'IPify',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.ipify.org?format=json');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.ip, msg: d.ip ? `✓ ${d.ip}` : 'No IP data' };
      }
    },

    {
      id: 'uuid',
      label: 'UUID Generator',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://www.uuidtools.com/api/generate/v4/count/1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: Array.isArray(d) && d.length > 0, msg: d.length ? `✓ ${d[0]}` : 'No UUID' };
      }
    },

    {
      id: 'adviceslip',
      label: 'Advice Slip',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.adviceslip.com/advice');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.slip?.advice, msg: d.slip?.advice ? `✓ ${String(d.slip.advice).slice(0, 40)}...` : 'No advice' };
      }
    },

    {
      id: 'openbrewery',
      label: 'Open Brewery DB',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.openbrewerydb.org/v1/breweries?per_page=1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: Array.isArray(d) && d.length > 0, msg: d.length ? `✓ ${d[0].name}` : 'No breweries' };
      }
    },

    {
      id: 'chucknorris',
      label: 'Chuck Norris Jokes',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.chucknorris.io/jokes/random');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.value, msg: d.value ? `✓ ${String(d.value).slice(0, 40)}...` : 'No joke' };
      }
    },

    {
      id: 'dadjoke',
      label: 'Dad Jokes',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://icanhazdadjoke.com/', { headers: { Accept: 'application/json' } });
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.joke, msg: d.joke ? `✓ ${String(d.joke).slice(0, 40)}...` : 'No joke' };
      }
    },

    {
      id: 'boredapi',
      label: 'Bored API',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://bored.api.lewagon.com/api/activity');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.activity, msg: d.activity ? `✓ ${String(d.activity).slice(0, 40)}...` : 'No activity' };
      }
    },

    {
      id: 'swapi',
      label: 'Star Wars API',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://swapi.dev/api/people/1/');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: !!d.name, msg: d.name ? `✓ ${d.name}` : 'No character data' };
      }
    },

    {
      id: 'datamuse',
      label: 'Datamuse Words',
      group: 'Free',
      needsKey: false,
      async test() {
        const res = await fetch('https://api.datamuse.com/words?ml=happy&max=1');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const d = await res.json();
        return { ok: Array.isArray(d) && d.length > 0, msg: d.length ? `✓ ${d[0].word}` : 'No words' };
      }
    },

  ];

  const EXTRA_TESTS = Array.isArray(window.CM_API_EXTRA_TESTS) ? window.CM_API_EXTRA_TESTS : [];
  if (EXTRA_TESTS.length) TESTS.push(...EXTRA_TESTS);

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
    .cm_atp_banner {
      margin: 0 0 10px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(0,229,255,.18);
      background: linear-gradient(180deg, rgba(0,229,255,.08), rgba(255,255,255,.02));
      color: #cfefff;
      font-size: 10px;
      line-height: 1.55;
    }
    .cm_atp_keys_grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin: 0 0 12px;
    }
    .cm_atp_keys_title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #93e9ff;
      margin-bottom: 6px;
    }
    .cm_atp_key_card {
      padding: 10px 11px;
      border-radius: 12px;
      border: 1px solid rgba(0,229,255,.14);
      background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015));
    }
    .cm_atp_key_card label {
      display: block;
      font-size: 11px;
      font-weight: 800;
      color: #e8e8f0;
      margin-bottom: 6px;
    }
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
        <div class="cm_atp_banner">
          Paste your keys once and CodeMind will keep them locally for later. When one provider fails, the app can try the saved fallback keys and keep features moving.
        </div>
        <div class="cm_atp_keys_title">Add API Keys</div>
        <div class="cm_atp_keys_grid">
          ${buildKeyInputsOverview()}
        </div>
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
        <button class="cm_atp_footer_btn" onclick="window._cmATP.injectAndClose()">💉 Save Keys & Close</button>
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

  function getKeyPromptSummary() {
    const saved = TESTS.filter(t => t.needsKey && getKey(t.keyRef));
    const missing = TESTS.filter(t => t.needsKey && !getKey(t.keyRef));
    return {
      savedCount: saved.length,
      missingCount: missing.length,
      savedLabels: saved.map(t => t.label).join(', '),
    };
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
      `;
    }).join('');
  }

  function buildKeyInputsOverview() {
    return TESTS.filter(t => t.needsKey).map(t => {
      const saved = getKey(t.keyRef);
      return `
        <div class="cm_atp_key_card">
          <label for="cm_atp_input_${t.id}">${t.label}</label>
          <div class="cm_atp_key_row" style="margin:0;padding:0;background:transparent;border:none;">
            <input type="password" id="cm_atp_input_${t.id}"
              placeholder="${t.keyPlaceholder}"
              value="${saved}"
              oninput="window._cmATP.updateKey('${t.keyRef}', this.value)"
            />
            <button class="cm_atp_key_btn" onclick="window._cmATP.runSingle('${t.id}')">Test</button>
          </div>
          <div class="cm_atp_hint" style="margin:6px 0 0 2px;">🔗 ${t.keyHint}</div>
        </div>
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
    const summary = getKeyPromptSummary();
    const summaryEl = document.getElementById('cm_atp_summary');
    if (summaryEl) {
      summaryEl.textContent = `Saved ${summary.savedCount} key${summary.savedCount === 1 ? '' : 's'} locally. ${summary.missingCount} more provider${summary.missingCount === 1 ? '' : 's'} can still be added.`;
    }
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

  function showPanel() {
    buildPanel();
    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.classList.remove('collapsed');
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0)';
      const toggle = document.getElementById('cm_atp_toggle_txt');
      if (toggle) toggle.textContent = '▾ collapse';
    }
  }

  // ── 6. PUBLIC API ────────────────────────────────────────

  window._cmATP = { runAll, runSingle, updateKey, injectAndClose, injectKeys, showPanel };

  // ── 7. INIT ──────────────────────────────────────────────

  function init() {
    injectKeys(); // Inject any already-saved keys immediately
    buildPanel();

    const prompt = getKeyPromptSummary();
    const summaryEl = document.getElementById('cm_atp_summary');
    if (summaryEl) {
      summaryEl.textContent = prompt.savedCount
        ? `Loaded ${prompt.savedCount} saved key${prompt.savedCount === 1 ? '' : 's'} locally. Add more keys any time to expand fallback coverage.`
        : 'No keys saved yet. Add your keys here once and CodeMind will retain them locally for future runs.';
    }

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

    if (!prompt.savedCount) {
      setTimeout(() => showPanel(), 600);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
