// ============================================================
// OPTION TAB API FIXES — focused fallbacks for selected tabs
// ============================================================
(function () {
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pick = (...ids) => ids.map(id => document.getElementById(id)).find(Boolean);

  async function json(url, context) {
    if (window.CodeMindSafety) return CodeMindSafety.fetchJson(url, {}, context);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${context || 'API'} HTTP ${res.status}`);
    return res.json();
  }

  function card(title, body, meta = '', url = '') {
    const titleHtml = url
      ? `<a href="${esc(url)}" target="_blank" style="color:var(--text);text-decoration:none">${esc(title)}</a>`
      : esc(title);
    return `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:13px;display:flex;flex-direction:column;gap:7px;">
      <div style="font-size:13px;font-weight:900;color:var(--text);line-height:1.35;">${titleHtml}</div>
      ${body ? `<div style="font-size:12px;color:var(--muted);line-height:1.55;">${body}</div>` : ''}
      ${meta ? `<div style="font-size:11px;color:var(--accent);font-family:'JetBrains Mono',monospace;">${meta}</div>` : ''}
    </div>`;
  }

  const localDocs = [
    ['Fetch API','Promise based browser HTTP API','https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API','web api http request'],
    ['Array.prototype.map','Transform each array item into a new array','https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map','javascript array map'],
    ['Array.prototype.flatMap','Map items and flatten one level','https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap','javascript array flatmap'],
    ['CSS Grid Layout','Two-dimensional CSS layout system','https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout','css grid layout'],
    ['Flexbox','One-dimensional CSS layout system','https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout','css flexbox'],
    ['async / await','Write promise code in a synchronous style','https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function','javascript async await promise'],
    ['localStorage','Persistent key-value browser storage','https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage','browser storage localstorage'],
    ['Canvas API','Draw graphics with JavaScript','https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API','canvas drawing html5']
  ];

  window.searchDocs = async function searchDocsFixed() {
    const query = pick('docsInput')?.value?.trim();
    const box = pick('docsResults');
    if (!query || !box) return;
    box.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:30px">Searching docs...</div>';
    try {
      const data = await json(`https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=en-US`, 'MDN Docs API');
      if (data.documents?.length) {
        box.innerHTML = data.documents.slice(0, 10).map(d => card(d.title, esc(d.summary || ''), `MDN · ${esc(d.mdn_url)}`, `https://developer.mozilla.org${d.mdn_url}`)).join('');
        return;
      }
      throw new Error('No MDN results');
    } catch (_) {
      const q = query.toLowerCase();
      const matches = localDocs.filter(([t, b, , k]) => `${t} ${b} ${k}`.toLowerCase().includes(q));
      box.innerHTML = matches.length
        ? matches.map(([t, b, u]) => card(t, esc(b), 'Local docs fallback', u)).join('')
        : `<div style="color:var(--muted);text-align:center;padding:30px">No local match. <a href="https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query)}" target="_blank" style="color:var(--accent)">Open MDN search</a></div>`;
    }
  };

  window.CodeMindOptionAPIs = window.CodeMindOptionAPIs || {};
  window.CodeMindOptionAPIs.fetchPapers = async function fetchPapersFixed() {
    const query = (pick('papersInput','mlPapersInput')?.value || 'large language models').trim();
    const out = pick('papersOutput','mlPapersOutput');
    if (!out) return;
    out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">Searching multiple paper sources...</div>';
    try {
      const data = await json(`https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=10&sort=cited_by_count:desc`, 'OpenAlex API');
      if (data.results?.length) {
        out.innerHTML = data.results.map(p => {
          const authors = (p.authorships || []).slice(0, 3).map(a => a.author?.display_name).filter(Boolean).join(', ');
          const year = p.publication_year || 'N/A';
          const cited = p.cited_by_count ? `${p.cited_by_count.toLocaleString()} citations` : 'citation count unavailable';
          return card(p.display_name, esc(p.abstract_inverted_index ? 'Abstract available on OpenAlex.' : 'No abstract available.'), `${authors || 'Unknown authors'} · ${year} · ${cited}`, p.doi || p.id);
        }).join('');
        return;
      }
      throw new Error('No OpenAlex results');
    } catch (_) {
      try {
        const text = await fetch(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=10&sortBy=submittedDate&sortOrder=descending`).then(r => r.text());
        const xml = new DOMParser().parseFromString(text, 'text/xml');
        const entries = [...xml.querySelectorAll('entry')];
        if (!entries.length) throw new Error('No arXiv results');
        out.innerHTML = entries.map(e => card(
          e.querySelector('title')?.textContent?.trim() || 'Untitled paper',
          esc((e.querySelector('summary')?.textContent || '').trim().slice(0, 260)) + '...',
          `${[...e.querySelectorAll('author name')].slice(0, 3).map(a => a.textContent).join(', ')} · ${(e.querySelector('published')?.textContent || '').slice(0, 10)}`,
          e.querySelector('id')?.textContent?.trim() || ''
        )).join('');
      } catch (e) {
        out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">Could not load paper APIs. <a href="https://scholar.google.com/scholar?q=${encodeURIComponent(query)}" target="_blank" style="color:var(--accent)">Search Google Scholar</a></div>`;
      }
    }
  };
  window.fetchPapers = window.CodeMindOptionAPIs.fetchPapers;

  const countriesFallback = {
    india:['India','New Delhi','Asia','1.4B+','Indian rupee (INR)','Hindi, English and many regional languages'],
    germany:['Germany','Berlin','Europe','84M+','Euro (EUR)','German'],
    japan:['Japan','Tokyo','Asia','124M+','Japanese yen (JPY)','Japanese'],
    brazil:['Brazil','Brasilia','South America','203M+','Brazilian real (BRL)','Portuguese'],
    australia:['Australia','Canberra','Oceania','26M+','Australian dollar (AUD)','English'],
    'united states':['United States','Washington, D.C.','North America','335M+','United States dollar (USD)','English']
  };

  window.fetchCountryInfo = async function fetchCountryInfoFixed() {
    const input = pick('countryInput')?.value?.trim();
    const out = pick('countryOutput');
    if (!input || !out) return;
    out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">Loading country data...</div>';
    try {
      const data = await json(`https://restcountries.com/v3.1/name/${encodeURIComponent(input)}?fullText=false`, 'REST Countries API');
      const c = data[0];
      if (!c) throw new Error('No country found');
      const rows = [
        ['Capital', (c.capital || []).join(', ')],
        ['Region', [c.region, c.subregion].filter(Boolean).join(' / ')],
        ['Population', Number(c.population || 0).toLocaleString()],
        ['Currency', Object.values(c.currencies || {}).map(x => `${x.name} (${x.symbol || '?'})`).join(', ')],
        ['Languages', Object.values(c.languages || {}).join(', ')],
        ['Timezones', (c.timezones || []).slice(0, 4).join(', ')]
      ];
      out.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;">
        <div style="font-size:20px;font-weight:900;color:var(--text);margin-bottom:10px;">${c.flags?.png ? `<img src="${c.flags.png}" style="height:28px;vertical-align:middle;margin-right:10px;border-radius:3px"/>` : ''}${esc(c.name?.common)}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;">${rows.map(([k,v]) => `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:8px;"><div style="font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase;">${k}</div><div style="font-size:12px;color:var(--text);">${esc(v || 'N/A')}</div></div>`).join('')}</div>
      </div>`;
    } catch (_) {
      const row = countriesFallback[input.toLowerCase()];
      out.innerHTML = row
        ? card(row[0], `Capital: ${row[1]}<br>Region: ${row[2]}<br>Population: ${row[3]}<br>Currency: ${row[4]}<br>Languages: ${row[5]}`, 'Local country fallback')
        : `<div style="color:var(--danger);text-align:center;padding:20px">Country API unavailable and no local fallback matched "${esc(input)}".</div>`;
    }
  };

  const localTrivia = [
    ['Which data structure uses FIFO order?', ['Queue','Stack','Heap','Tree'], 0],
    ['What does SQL stand for?', ['Structured Query Language','Simple Query Logic','System Queue Language','Scripted Query List'], 0],
    ['Which HTTP status means Not Found?', ['404','200','301','500'], 0],
    ['Which keyword declares a constant in JavaScript?', ['const','let','var','static'], 0],
    ['Which sorting algorithm commonly has O(n log n) average time?', ['Merge sort','Bubble sort','Linear search','Selection only'], 0]
  ];

  window.fetchTrivia = async function fetchTriviaFixed() {
    const amount = Math.max(1, Math.min(20, parseInt(pick('triviaAmount')?.value || '5', 10)));
    const out = pick('triviaOutput');
    if (!out) return;
    out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">Loading trivia...</div>';
    try {
      const data = await json(`https://opentdb.com/api.php?amount=${amount}&type=multiple&encode=url3986`, 'Open Trivia DB');
      if (!data.results?.length) throw new Error('No trivia returned');
      out.innerHTML = data.results.map((q, idx) => {
        const answers = [...q.incorrect_answers, q.correct_answer].map(decodeURIComponent).sort(() => Math.random() - 0.5);
        return card(`${idx + 1}. ${decodeURIComponent(q.question)}`, answers.map(a => `• ${esc(a)}`).join('<br>'), `${decodeURIComponent(q.category)} · ${q.difficulty}`);
      }).join('');
    } catch (_) {
      out.innerHTML = localTrivia.slice(0, amount).map(([q, answers], idx) => card(`${idx + 1}. ${q}`, answers.map(a => `• ${esc(a)}`).join('<br>'), 'Local trivia fallback')).join('');
    }
  };

  window.lookupGhProfile = async function lookupGhProfileFixed() {
    const user = pick('ghProfileInput')?.value?.trim();
    const box = pick('ghProfileResult');
    if (!user || !box) return;
    box.innerHTML = '<div style="color:var(--muted);font-size:11px">Loading GitHub profile...</div>';
    try {
      const u = await json(`https://api.github.com/users/${encodeURIComponent(user)}`, 'GitHub Profile API');
      box.innerHTML = `<div class="gh-profile-row"><img src="${u.avatar_url}" class="gh-avatar" onerror="this.style.display='none'"/><div><div class="gh-username">${esc(u.login)}</div><div class="gh-bio">${esc(u.bio || 'No bio')}</div></div></div>
      <div class="gh-stats-grid"><div class="gh-stat"><div class="gh-stat-val">${u.public_repos}</div><div class="gh-stat-label">Repos</div></div><div class="gh-stat"><div class="gh-stat-val">${u.followers}</div><div class="gh-stat-label">Followers</div></div><div class="gh-stat"><div class="gh-stat-val">${u.following}</div><div class="gh-stat-label">Following</div></div></div>`;
    } catch (_) {
      box.innerHTML = `<div style="font-size:11px;color:var(--warn)">GitHub API unavailable. <a href="https://github.com/${encodeURIComponent(user)}" target="_blank" style="color:var(--accent)">Open profile directly</a></div>`;
    }
  };

  const oldRunSQL = window.runSQL;
  window.runSQL = function runSQLFixed() {
    if (typeof oldRunSQL === 'function') return oldRunSQL();
    const out = pick('sqlOutput');
    if (out) out.innerHTML = '<span style="color:var(--danger)">SQL engine did not initialize.</span>';
  };
})();
