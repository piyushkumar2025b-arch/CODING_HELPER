// ============================================================
// NPM PACKAGE INFO — npm Registry API (free, no key)
// ============================================================
async function fetchNpmPkg() {
  const name = document.getElementById('npmPkgInput').value.trim();
  if (!name) { alert('Enter a package name!'); return; }
  const out = document.getElementById('npmPkgOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">📦 Fetching package info...</div>';
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
    if (!res.ok) { out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ Package "${name}" not found on npm.</div>`; return; }
    const d = await res.json();
    const latest = d['dist-tags']?.latest || Object.keys(d.versions||{}).pop();
    const v = d.versions?.[latest] || {};
    const dls = await fetchNpmDownloads(name);
    const deps = Object.keys(v.dependencies||{});
    const devDeps = Object.keys(v.devDependencies||{});
    out.innerHTML = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-size:18px;font-weight:800;color:var(--accent);font-family:'JetBrains Mono',monospace;">${d.name}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:3px;">${d.description||'No description'}</div>
          </div>
          <div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;">
            <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(0,229,255,.1);color:var(--accent);border:1px solid rgba(0,229,255,.3);">v${latest}</span>
            ${v.license?`<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(16,185,129,.1);color:var(--accent3);border:1px solid rgba(16,185,129,.3);">${v.license}</span>`:''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;">
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Weekly Downloads</div>
            <div style="font-size:16px;font-weight:800;color:var(--accent3);">${dls}</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Total Versions</div>
            <div style="font-size:16px;font-weight:800;color:var(--accent);">${Object.keys(d.versions||{}).length}</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Dependencies</div>
            <div style="font-size:16px;font-weight:800;color:var(--warn);">${deps.length}</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Last Published</div>
            <div style="font-size:13px;font-weight:700;color:var(--text);">${d.time?.[latest]?new Date(d.time[latest]).toLocaleDateString():'N/A'}</div>
          </div>
        </div>
        ${v.homepage||d.homepage?`<div><a href="${v.homepage||d.homepage}" target="_blank" style="color:var(--accent);font-size:12px;font-family:'JetBrains Mono',monospace;">🔗 ${v.homepage||d.homepage}</a></div>`:''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <code style="background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 14px;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--accent3);cursor:pointer;user-select:all;" onclick="navigator.clipboard.writeText(this.textContent)" title="Click to copy">npm install ${d.name}</code>
          <code style="background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 14px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#c4b5fd;cursor:pointer;user-select:all;" onclick="navigator.clipboard.writeText(this.textContent)" title="Click to copy">yarn add ${d.name}</code>
        </div>
        ${deps.length?`<div><div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Dependencies (${deps.length})</div><div style="display:flex;gap:5px;flex-wrap:wrap;">${deps.slice(0,20).map(dep=>`<span style="padding:2px 8px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:4px;font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--warn);cursor:pointer;" onclick="document.getElementById('npmPkgInput').value='${dep}';fetchNpmPkg()">${dep}</span>`).join('')}${deps.length>20?`<span style="font-size:11px;color:var(--muted)">+${deps.length-20} more</span>`:''}</div></div>`:''}
        ${v.keywords?.length?`<div><div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Keywords</div><div style="display:flex;gap:5px;flex-wrap:wrap;">${v.keywords.slice(0,15).map(kw=>`<span style="padding:2px 8px;background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.15);border-radius:4px;font-size:11px;color:var(--accent);font-family:'JetBrains Mono',monospace;">${kw}</span>`).join('')}</div></div>`:''}
        <a href="https://www.npmjs.com/package/${d.name}" target="_blank" style="color:var(--accent);font-size:12px;font-weight:700;text-decoration:none;">→ View on npmjs.com</a>
      </div>`;
  } catch(e) {
    out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ Error: ${e.message}</div>`;
  }
}

async function fetchNpmDownloads(name) {
  try {
    const res = await fetch(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`);
    const d = await res.json();
    return d.downloads ? d.downloads.toLocaleString() : 'N/A';
  } catch { return 'N/A'; }
}

async function searchNpmPkgs() {
  const q = document.getElementById('npmPkgInput').value.trim();
  if (!q) { alert('Enter a search term!'); return; }
  const out = document.getElementById('npmPkgOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">🔎 Searching npm registry...</div>';
  try {
    const res = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=10`);
    const data = await res.json();
    if (!data.objects?.length) { out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">No results found.</div>'; return; }
    out.innerHTML = data.objects.map(o => {
      const p = o.package;
      return `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" onclick="document.getElementById('npmPkgInput').value='${p.name}';fetchNpmPkg()">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="font-size:14px;font-weight:800;color:var(--accent);font-family:'JetBrains Mono',monospace;">${p.name}</span>
          <span style="font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;">v${p.version}</span>
          ${p.links?.npm?`<a href="${p.links.npm}" target="_blank" style="font-size:10px;color:var(--accent);margin-left:auto;font-family:'JetBrains Mono',monospace;" onclick="event.stopPropagation()">npm →</a>`:''}
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:5px;">${p.description||'No description'}</div>
        <div style="display:flex;gap:8px;font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--muted);">
          ${p.date?`<span>📅 ${new Date(p.date).toLocaleDateString()}</span>`:''}
          ${o.score?.detail?.popularity?`<span>📈 ${(o.score.detail.popularity*100).toFixed(0)}% pop</span>`:''}
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ ${e.message}</div>`;
  }
}

// ============================================================
// GITHUB REPO SEARCH — GitHub REST API (free, 60 req/hr no key)
// ============================================================
async function searchGhRepos() {
  const q = document.getElementById('ghRepoInput').value.trim();
  if (!q) { alert('Enter a search term!'); return; }
  const lang = document.getElementById('ghRepoLang').value;
  const sort = document.getElementById('ghRepoSort').value;
  const out = document.getElementById('ghRepoOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">🐙 Searching GitHub...</div>';
  let url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}${lang?`+language:${lang}`:''}&sort=${sort}&order=desc&per_page=10`;
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (ghToken) headers['Authorization'] = `token ${ghToken}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json();
      out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ GitHub API: ${err.message||res.statusText}<br><small style="color:var(--muted)">Rate limited? Add a GitHub token in the Gist header button.</small></div>`;
      return;
    }
    const data = await res.json();
    if (!data.items?.length) { out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">No repos found. Try different keywords.</div>'; return; }
    out.innerHTML = `<div style="font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:4px;">Found ${data.total_count.toLocaleString()} repos · showing top 10</div>` +
      data.items.map(r => {
        const updated = new Date(r.updated_at).toLocaleDateString();
        return `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:13px;transition:border-color .15s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:5px;flex-wrap:wrap;">
            <a href="${r.html_url}" target="_blank" style="font-size:14px;font-weight:800;color:var(--accent);text-decoration:none;font-family:'JetBrains Mono',monospace;">${r.full_name}</a>
            ${r.language?`<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(124,58,237,.12);color:#c4b5fd;border:1px solid rgba(124,58,237,.3);">${r.language}</span>`:''}
            ${r.archived?'<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(245,158,11,.1);color:var(--warn);">archived</span>':''}
          </div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:7px;line-height:1.5;">${r.description||'No description'}</div>
          <div style="display:flex;gap:12px;font-size:11px;font-family:'JetBrains Mono',monospace;flex-wrap:wrap;">
            <span style="color:var(--warn);">⭐ ${r.stargazers_count.toLocaleString()}</span>
            <span style="color:var(--muted);">🍴 ${r.forks_count.toLocaleString()}</span>
            <span style="color:var(--muted);">👁 ${r.watchers_count.toLocaleString()}</span>
            <span style="color:var(--muted);">🕐 ${updated}</span>
            ${r.open_issues_count?`<span style="color:var(--danger);">🐛 ${r.open_issues_count} issues</span>`:''}
          </div>
          ${r.topics?.length?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">${r.topics.slice(0,8).map(t=>`<span style="padding:2px 7px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);border-radius:4px;font-size:10px;color:#93c5fd;font-family:'JetBrains Mono',monospace;">${t}</span>`).join('')}</div>`:''}
        </div>`;
      }).join('');
  } catch(e) {
    out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ ${e.message}</div>`;
  }
}

// ============================================================
// CAN I USE — dedicated tab (uses same data + MDN search)
// ============================================================
const CANIUSE_DATA = [
  { name:'CSS Grid Layout', slug:'css-grid', support:'96%', url:'https://caniuse.com/css-grid', desc:'Two-dimensional layout system for the web' },
  { name:'CSS Flexbox', slug:'flexbox', support:'99%', url:'https://caniuse.com/flexbox', desc:'One-dimensional layout method for items in rows/columns' },
  { name:'CSS Variables (Custom Properties)', slug:'css-variables', support:'97%', url:'https://caniuse.com/css-variables', desc:'Define reusable values via --property-name syntax' },
  { name:'CSS Container Queries', slug:'css-container-queries', support:'90%', url:'https://caniuse.com/css-container-queries', desc:'Style elements based on parent container size' },
  { name:'CSS :has() Selector', slug:'css-has', support:'88%', url:'https://caniuse.com/css-has', desc:'Parent selector — match elements containing specific children' },
  { name:'CSS Subgrid', slug:'css-subgrid', support:'86%', url:'https://caniuse.com/css-subgrid', desc:'Align grid items to parent grid tracks' },
  { name:'CSS Nesting', slug:'css-nesting', support:'87%', url:'https://caniuse.com/css-nesting', desc:'Native CSS nesting without a preprocessor' },
  { name:'CSS Scroll Snap', slug:'css-snappoints', support:'97%', url:'https://caniuse.com/css-snappoints', desc:'Snap scroll positions to specific elements' },
  { name:'CSS aspect-ratio', slug:'mdn-css_properties_aspect-ratio', support:'96%', url:'https://caniuse.com/mdn-css_properties_aspect-ratio', desc:'Maintain element aspect ratios' },
  { name:'CSS @layer', slug:'css-cascade-layers', support:'90%', url:'https://caniuse.com/css-cascade-layers', desc:'Cascade layers for controlling specificity' },
  { name:'View Transitions API', slug:'view-transitions', support:'75%', url:'https://caniuse.com/view-transitions', desc:'Animated transitions between page states' },
  { name:'Fetch API', slug:'fetch', support:'98%', url:'https://caniuse.com/fetch', desc:'Modern promise-based HTTP requests' },
  { name:'Async/Await', slug:'async-functions', support:'97%', url:'https://caniuse.com/async-functions', desc:'Syntactic sugar over Promises for async code' },
  { name:'Optional Chaining (?.)', slug:'mdn-javascript_operators_optional_chaining', support:'96%', url:'https://caniuse.com/mdn-javascript_operators_optional_chaining', desc:'Safe property access without null checks' },
  { name:'Nullish Coalescing (??)', slug:'mdn-javascript_operators_nullish_coalescing', support:'96%', url:'https://caniuse.com/mdn-javascript_operators_nullish_coalescing', desc:'Return right-hand value when left is null/undefined' },
  { name:'ES Modules', slug:'es6-module', support:'97%', url:'https://caniuse.com/es6-module', desc:'Native import/export in browsers' },
  { name:'Dynamic import()', slug:'es6-module-dynamic-import', support:'96%', url:'https://caniuse.com/es6-module-dynamic-import', desc:'Lazy-load modules on demand' },
  { name:'Web Components / Custom Elements', slug:'custom-elementsv1', support:'95%', url:'https://caniuse.com/custom-elementsv1', desc:'Create reusable custom HTML elements' },
  { name:'Shadow DOM', slug:'shadowdomv1', support:'96%', url:'https://caniuse.com/shadowdomv1', desc:'Encapsulated DOM trees for web components' },
  { name:'Service Workers', slug:'serviceworkers', support:'97%', url:'https://caniuse.com/serviceworkers', desc:'Background scripts for offline/PWA support' },
  { name:'WebAssembly (Wasm)', slug:'wasm', support:'96%', url:'https://caniuse.com/wasm', desc:'Binary instruction format for near-native performance' },
  { name:'WebSockets', slug:'websockets', support:'98%', url:'https://caniuse.com/websockets', desc:'Full-duplex communication channels over TCP' },
  { name:'Web Workers', slug:'webworkers', support:'97%', url:'https://caniuse.com/webworkers', desc:'Run scripts in background threads' },
  { name:'IntersectionObserver', slug:'intersectionobserver', support:'97%', url:'https://caniuse.com/intersectionobserver', desc:'Detect when elements enter the viewport' },
  { name:'ResizeObserver', slug:'resizeobserver', support:'97%', url:'https://caniuse.com/resizeobserver', desc:'Observe changes to element dimensions' },
  { name:'MutationObserver', slug:'mutationobserver', support:'97%', url:'https://caniuse.com/mutationobserver', desc:'Watch for DOM changes asynchronously' },
  { name:'WebP Image Format', slug:'webp', support:'97%', url:'https://caniuse.com/webp', desc:'Efficient image format with lossy & lossless modes' },
  { name:'AVIF Image Format', slug:'avif', support:'91%', url:'https://caniuse.com/avif', desc:'Next-gen image format, better compression than WebP' },
  { name:'CSS backdrop-filter', slug:'css-backdrop-filter', support:'91%', url:'https://caniuse.com/css-backdrop-filter', desc:'Apply filters like blur to area behind element' },
  { name:'CSS Animations', slug:'css-animation', support:'97%', url:'https://caniuse.com/css-animation', desc:'Animate CSS properties with @keyframes' },
  { name:'Clipboard API', slug:'clipboard', support:'90%', url:'https://caniuse.com/clipboard', desc:'Read/write to system clipboard programmatically' },
  { name:'Geolocation API', slug:'geolocation', support:'97%', url:'https://caniuse.com/geolocation', desc:'Get user geographic location' },
  { name:'WebGL 2.0', slug:'webgl2', support:'93%', url:'https://caniuse.com/webgl2', desc:'3D graphics in the browser' },
  { name:'CSS Grid Masonry', slug:'css-grid-masonry', support:'10%', url:'https://caniuse.com/css-grid-masonry', desc:'Native masonry layout (experimental)' },
  { name:'Popover API', slug:'mdn-html_global_attributes_popover', support:'86%', url:'https://caniuse.com/mdn-html_global_attributes_popover', desc:'Native browser popover without JS' },
];

function searchCaniuse() {
  const q = (document.getElementById('caniuseInput').value || '').toLowerCase().trim();
  const out = document.getElementById('caniuseOutput');
  if (!q) { out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:30px">Enter a feature name to check browser support.</div>'; return; }
  const matches = CANIUSE_DATA.filter(f =>
    f.name.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q) || (f.desc||'').toLowerCase().includes(q)
  );
  if (!matches.length) {
    out.innerHTML = `<div style="text-align:center;padding:30px;">
      <div style="color:var(--muted);font-size:13px;margin-bottom:10px;">No local results for "${q}".</div>
      <a href="https://caniuse.com/?search=${encodeURIComponent(q)}" target="_blank" style="color:var(--accent);font-weight:700;">🔗 Search caniuse.com directly →</a>
    </div>`;
    return;
  }
  out.innerHTML = matches.map(f => {
    const pct = parseInt(f.support);
    const col = pct >= 95 ? 'var(--accent3)' : pct >= 80 ? 'var(--warn)' : 'var(--danger)';
    const status = pct >= 95 ? '✅ Excellent' : pct >= 80 ? '⚠️ Good' : '❌ Limited';
    return `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:13px;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <a href="${f.url}" target="_blank" style="font-size:14px;font-weight:800;color:var(--text);text-decoration:none;">${f.name}</a>
        <span style="font-size:12px;font-weight:700;color:${col};">${status}</span>
        <span style="margin-left:auto;font-size:13px;font-weight:900;color:${col};font-family:'JetBrains Mono',monospace;">${f.support}</span>
      </div>
      <div style="font-size:12px;color:var(--muted);">${f.desc}</div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
          <div style="width:${f.support};height:100%;background:linear-gradient(90deg,${col}80,${col});border-radius:4px;"></div>
        </div>
        <a href="${f.url}" target="_blank" style="font-size:11px;color:var(--accent);font-family:'JetBrains Mono',monospace;text-decoration:none;white-space:nowrap;">caniuse.com →</a>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// DEV QUOTES — quoteslate.it + JokeAPI (free, no key)
// ============================================================
const FALLBACK_QUOTES = [
  { content: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { content: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { content: "Experience is the name everyone gives to their mistakes.", author: "Oscar Wilde" },
  { content: "In order to be irreplaceable, one must always be different.", author: "Coco Chanel" },
  { content: "Java is to JavaScript what car is to carpet.", author: "Chris Heilmann" },
  { content: "Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live.", author: "John Woods" },
  { content: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { content: "The best way to get a project done faster is to start sooner.", author: "Jim Highsmith" },
  { content: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { content: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
  { content: "Walking on water and developing software from a specification are easy if both are frozen.", author: "Edward V. Berard" },
  { content: "It's not a bug – it's an undocumented feature.", author: "Unknown" },
  { content: "The function of good software is to make the complex appear to be simple.", author: "Grady Booch" },
  { content: "Debugging is twice as hard as writing the code in the first place.", author: "Brian Kernighan" },
  { content: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
];

async function fetchDevQuote() {
  const out = document.getElementById('devQuoteOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">💬 Fetching quote...</div>';
  // Use a random fallback since external quote APIs often have CORS issues
  const q = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  renderDevQuote(out, q.content, q.author);
}

function renderDevQuote(out, content, author) {
  out.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;position:relative;overflow:hidden;">
    <div style="position:absolute;top:10px;left:16px;font-size:60px;color:var(--accent);opacity:.08;font-family:Georgia,serif;line-height:1;">"</div>
    <div style="font-size:16px;line-height:1.75;color:var(--text);font-style:italic;margin-bottom:14px;position:relative;z-index:1;">${content}</div>
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="width:28px;height:2px;background:var(--accent);border-radius:2px;"></div>
      <div style="font-size:13px;font-weight:700;color:var(--accent);">— ${author}</div>
      <button onclick="navigator.clipboard.writeText('${content.replace(/'/g,"\\'")} — ${author}');this.textContent='✓ Copied!';setTimeout(()=>this.textContent='📋 Copy',1500)" style="margin-left:auto;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--muted);font-size:11px;cursor:pointer;font-family:'Syne',sans-serif;">📋 Copy</button>
    </div>
  </div>
  <button class="btn btn-primary" onclick="fetchDevQuote()" style="margin-top:8px;max-width:180px;font-size:12px;padding:8px 16px;">🎲 Another Quote</button>`;
}

async function fetchProgrammingJoke() {
  const out = document.getElementById('devQuoteOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">😂 Fetching joke...</div>';
  try {
    const res = await fetch('https://v2.jokeapi.dev/joke/Programming?safe-mode');
    const d = await res.json();
    if (d.type === 'single') {
      renderJoke(out, d.joke, null);
    } else {
      renderJoke(out, d.setup, d.delivery);
    }
  } catch(e) {
    const jokes = [
      { setup: "Why do programmers prefer dark mode?", delivery: "Because light attracts bugs! 🐛" },
      { setup: "Why do Java developers wear glasses?", delivery: "Because they don't C#! 👓" },
      { setup: "A SQL query walks into a bar, walks up to two tables and asks...", delivery: "\"Can I join you?\" 🍺" },
      { setup: "How many programmers does it take to change a light bulb?", delivery: "None — it's a hardware problem! 💡" },
    ];
    const j = jokes[Math.floor(Math.random() * jokes.length)];
    renderJoke(out, j.setup, j.delivery);
  }
}

function renderJoke(out, setup, delivery) {
  out.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:10px;">
    <div style="font-size:32px;text-align:center;">😂</div>
    <div style="font-size:15px;font-weight:700;color:var(--text);text-align:center;line-height:1.6;">${setup}</div>
    ${delivery?`<div id="jokeDelivery" style="display:none;font-size:15px;color:var(--accent3);text-align:center;font-weight:700;padding:10px;background:rgba(16,185,129,.07);border-radius:8px;line-height:1.6;">${delivery}</div>
    <button class="btn btn-primary" onclick="document.getElementById('jokeDelivery').style.display='';this.style.display='none'" style="margin:0 auto;font-size:12px;padding:8px 20px;">🥁 Punchline!</button>`:''}
  </div>
  <button class="btn btn-secondary" onclick="fetchProgrammingJoke()" style="margin-top:8px;max-width:200px;font-size:12px;padding:8px 16px;">😂 Another Joke</button>`;
}

async function fetchMultipleQuotes() {
  const out = document.getElementById('devQuoteOutput');
  out.innerHTML = '';
  const shuffled = [...FALLBACK_QUOTES].sort(() => Math.random() - 0.5).slice(0, 5);
  out.innerHTML = shuffled.map(q => `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;position:relative;">
      <div style="font-size:13px;line-height:1.7;color:var(--text);font-style:italic;margin-bottom:8px;">"${q.content}"</div>
      <div style="font-size:11px;font-weight:700;color:var(--accent);">— ${q.author}</div>
    </div>`).join('');
}

// ============================================================
// IP / DNS LOOKUP — ipapi.co + dns.google (free, no key)
// ============================================================
async function fetchMyIP() {
  const out = document.getElementById('ipLookupOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">📍 Getting your IP...</div>';
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error(`ipapi HTTP ${res.status}`);
    const d = await res.json();
    renderIPInfo(out, d, null);
  } catch(e) {
    try {
      const res = await fetch('https://ipwho.is/');
      if (!res.ok) throw new Error(`ipwho.is HTTP ${res.status}`);
      const d = await res.json();
      renderIPInfo(out, normalizeIpWhoIs(d), null);
    } catch(e2) {
      out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ Free IP APIs unavailable.</div>`;
    }
  }
}

async function lookupIP() {
  const input = document.getElementById('ipLookupInput').value.trim();
  if (!input) { alert('Enter an IP address or domain!'); return; }
  const out = document.getElementById('ipLookupOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">🔍 Looking up...</div>';

  // Check if domain
  const isDomain = /^[a-zA-Z]/.test(input) && !input.startsWith('http');
  let ipData = null, dnsData = null;

  try {
    // IP geolocation
    const endpoint = isDomain ? `https://ipapi.co/${encodeURIComponent(input)}/json/` : `https://ipapi.co/${encodeURIComponent(input)}/json/`;
    const ipRes = await fetch(endpoint);
    if (!ipRes.ok) throw new Error(`ipapi HTTP ${ipRes.status}`);
    ipData = await ipRes.json();
  } catch(e) {
    try {
      const endpoint = isDomain ? `https://ipwho.is/${encodeURIComponent(input)}` : `https://ipwho.is/${encodeURIComponent(input)}`;
      const ipRes = await fetch(endpoint);
      if (!ipRes.ok) throw new Error(`ipwho.is HTTP ${ipRes.status}`);
      ipData = normalizeIpWhoIs(await ipRes.json());
    } catch(_) {}
  }

  if (isDomain) {
    try {
      // DNS lookup via Google DoH
      const dnsRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(input)}&type=A`);
      dnsData = await dnsRes.json();
    } catch(e) {}
  }

  renderIPInfo(out, ipData, dnsData, input);
}

function normalizeIpWhoIs(d) {
  if (!d || d.success === false) return { error: true, reason: d?.message || 'Lookup failed' };
  return {
    ip: d.ip,
    city: d.city,
    region: d.region,
    country_name: d.country,
    country_code: d.country_code,
    continent_code: d.continent_code,
    postal: d.postal,
    latitude: d.latitude,
    longitude: d.longitude,
    timezone: d.timezone?.id,
    org: d.connection?.org || d.connection?.isp,
    asn: d.connection?.asn ? `AS${d.connection.asn}` : '',
    country_calling_code: d.calling_code ? `+${d.calling_code}` : '',
    currency: d.currency?.code,
    languages: ''
  };
}

function renderIPInfo(out, d, dnsData, originalInput) {
  if (!d || d.error) {
    out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ Could not resolve "${originalInput||'IP'}". ${d?.reason||''}</div>`;
    return;
  }
  const fields = [
    ['🌐 IP Address', d.ip],
    ['🏙️ City', d.city],
    ['🗺️ Region', d.region],
    ['🌍 Country', `${d.country_name||''} ${d.country_code?`(${d.country_code})`:''}`.trim()],
    ['🌏 Continent', d.continent_code],
    ['📮 Postal', d.postal],
    ['📍 Coordinates', d.latitude && d.longitude ? `${d.latitude}, ${d.longitude}` : null],
    ['⏰ Timezone', d.timezone],
    ['🔌 ISP / Org', d.org],
    ['🛡️ ASN', d.asn],
    ['📞 Calling Code', d.country_calling_code],
    ['💱 Currency', d.currency],
    ['🗣️ Languages', d.languages],
  ].filter(([,v]) => v);

  out.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">
    <div style="font-size:16px;font-weight:800;color:var(--accent);font-family:'JetBrains Mono',monospace;">${d.ip || originalInput}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:7px;">
      ${fields.map(([label, val]) => `
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:8px 11px;">
          <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">${label}</div>
          <div style="font-size:13px;font-family:'JetBrains Mono',monospace;color:var(--text);">${val}</div>
        </div>`).join('')}
    </div>
    ${d.latitude && d.longitude ? `<a href="https://www.openstreetmap.org/?mlat=${d.latitude}&mlon=${d.longitude}&zoom=10" target="_blank" style="color:var(--accent);font-size:12px;font-weight:700;text-decoration:none;">📍 View on Map →</a>` : ''}
  </div>
  ${dnsData?.Answer ? `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;">
    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">DNS Records (A)</div>
    ${dnsData.Answer.map(r => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:12px;"><span style="color:var(--muted);">${r.name}</span><span style="color:var(--accent);">${r.data}</span><span style="color:var(--muted);">TTL: ${r.TTL}s</span></div>`).join('')}
  </div>` : ''}`;
}

// ============================================================
// COLOR PALETTE API — TheColorAPI.com (free, no key)
// ============================================================
let colorScheme = 'monochrome';

function setColorScheme(el, scheme) {
  colorScheme = scheme;
  document.querySelectorAll('#colorApiPaletteScheme .opt-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function randomColorPalette() {
  const hex = Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0');
  document.getElementById('colorApiInput').value = '#' + hex;
  document.getElementById('colorApiPicker').value = '#' + hex;
  fetchColorPalette();
}

async function fetchColorPalette() {
  const raw = document.getElementById('colorApiInput').value.trim() || document.getElementById('colorApiPicker').value;
  const hex = raw.replace('#','').toLowerCase();
  const out = document.getElementById('colorApiOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">🎨 Generating palette...</div>';
  try {
    // thecolorapi.com — free, no key
    const res = await fetch(`https://www.thecolorapi.com/scheme?hex=${hex}&mode=${colorScheme}&count=6&format=json`);
    const data = await res.json();
    // Also get color name info
    const nameRes = await fetch(`https://www.thecolorapi.com/id?hex=${hex}&format=json`);
    const nameData = await nameRes.json();

    const swatches = data.colors || [];
    const seed = data.seed || {};

    out.innerHTML = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">
        <!-- Seed color info -->
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="width:56px;height:56px;border-radius:10px;background:#${hex};border:2px solid var(--border);flex-shrink:0;"></div>
          <div>
            <div style="font-size:16px;font-weight:800;color:var(--text);">${nameData.name?.value || 'Custom Color'}</div>
            <div style="font-size:12px;font-family:'JetBrains Mono',monospace;color:var(--muted);">HEX: #${hex.toUpperCase()}</div>
            <div style="font-size:12px;font-family:'JetBrains Mono',monospace;color:var(--muted);">RGB: ${nameData.rgb?.value || ''} · HSL: ${nameData.hsl?.value || ''}</div>
          </div>
          <div style="margin-left:auto;display:flex;gap:6px;flex-direction:column;align-items:flex-end;">
            <code style="font-family:'JetBrains Mono',monospace;font-size:11px;background:var(--bg);border:1px solid var(--border);padding:3px 8px;border-radius:4px;color:var(--accent);cursor:pointer;" onclick="navigator.clipboard.writeText('#${hex.toUpperCase()}');this.textContent='✓';setTimeout(()=>this.textContent='#${hex.toUpperCase()}',1000)" title="Copy hex">#${hex.toUpperCase()}</code>
          </div>
        </div>

        <!-- Palette swatches -->
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">${colorScheme.charAt(0).toUpperCase()+colorScheme.slice(1)} Palette</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${swatches.map(c => `
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;" onclick="document.getElementById('colorApiInput').value='${c.hex.value}';document.getElementById('colorApiPicker').value='${c.hex.value}';navigator.clipboard.writeText('${c.hex.value}')" title="Click to copy ${c.hex.value}">
                <div style="width:52px;height:52px;border-radius:9px;background:${c.hex.value};border:2px solid var(--border);transition:transform .15s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform=''"></div>
                <div style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--muted);">${c.hex.value}</div>
                <div style="font-size:9px;color:var(--muted);max-width:60px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${c.name.value}">${c.name.value}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- CSS snippet -->
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">CSS Custom Properties</div>
          <code style="display:block;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent3);white-space:pre-wrap;cursor:pointer;line-height:1.7;" onclick="navigator.clipboard.writeText(this.textContent);this.style.borderColor='var(--accent3)';setTimeout(()=>this.style.borderColor='var(--border)',1200)" title="Click to copy">:root {
${swatches.map((c,i) => `  --color-${i+1}: ${c.hex.value};`).join('\n')}
}</code>
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">CSS Theme Recipe</div>
          <code style="display:block;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent3);white-space:pre-wrap;cursor:pointer;line-height:1.7;" onclick="navigator.clipboard.writeText(this.textContent);this.style.borderColor='var(--accent3)';setTimeout(()=>this.style.borderColor='var(--border)',1200)" title="Click to copy">.card {
  background: var(--color-1);
  border: 1px solid var(--color-2);
  box-shadow: 0 12px 30px color-mix(in srgb, var(--color-3) 30%, transparent);
}

.button {
  background: linear-gradient(135deg, var(--color-4), var(--color-5));
  color: var(--color-6);
}</code>
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">CSS Variables Preview</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;">
            ${swatches.slice(0,6).map((c,i) => `<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <div style="width:16px;height:16px;border-radius:4px;background:${c.hex.value};border:1px solid var(--border);"></div>
                <div style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--muted);">--color-${i+1}</div>
              </div>
              <div style="font-size:11px;color:var(--text);font-family:'JetBrains Mono',monospace;">${c.hex.value}</div>
            </div>`).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">CSS Utility Snippets</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;">
            ${[
              ['Layout', '.stack { display: flex; flex-direction: column; gap: 1rem; }'],
              ['Clamp', '.title { font-size: clamp(1.25rem, 2vw, 2rem); }'],
              ['Grid', '.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }'],
              ['Tokens', ':root { --radius: 16px; --shadow: 0 16px 40px rgba(0,0,0,.18); }']
            ].map(([label, code]) => `<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;">
              <div style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${label}</div>
              <code style="display:block;font-size:10px;line-height:1.5;color:var(--text);font-family:'JetBrains Mono',monospace;white-space:pre-wrap;cursor:pointer;" onclick="navigator.clipboard.writeText(this.textContent);this.style.color='var(--accent3)';setTimeout(()=>this.style.color='var(--text)',1000)">${code}</code>
            </div>`).join('')}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;">
          ${[
            ['API use','TheColorAPI palette + color name lookup'],
            ['CSS use','Theme tokens, gradients, button accents'],
            ['Copy flow','Click any swatch or snippet to copy instantly']
          ].map(([k,v]) => `<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">${k}</div>
            <div style="font-size:12px;color:var(--text);line-height:1.5;">${v}</div>
          </div>`).join('')}
        </div>
        <a href="https://www.thecolorapi.com" target="_blank" style="font-size:11px;color:var(--muted);text-decoration:none;">Powered by The Color API — free, no key</a>
      </div>`;
  } catch(e) {
    try {
      const nameRes = await fetch(`https://api.color.pizza/v1/${hex}`);
      if (!nameRes.ok) throw new Error(`Color.pizza HTTP ${nameRes.status}`);
      const nameData = await nameRes.json();
      out.innerHTML = generateLocalPalette(hex, nameData.colors?.[0]?.name || 'Custom Color', 'Color.pizza backup + local palette');
    } catch(e2) {
      out.innerHTML = generateLocalPalette(hex);
    }
  }
}

function generateLocalPalette(hex, colorName = 'Local Color', sourceLabel = 'Local fallback') {
  // Parse hex to HSL and generate palette client-side as fallback
  const r = parseInt(hex.slice(0,2),16)/255, g=parseInt(hex.slice(2,4),16)/255, b=parseInt(hex.slice(4,6),16)/255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), delta=max-min;
  let h=0, s=0, l=(max+min)/2;
  if(delta){ s=delta/(1-Math.abs(2*l-1)); if(max===r)h=((g-b)/delta)%6; else if(max===g)h=(b-r)/delta+2; else h=(r-g)/delta+4; h=Math.round(h*60); if(h<0)h+=360; s=Math.round(s*100); l=Math.round(l*100); }
  const hslToHex=(hh,ss,ll)=>{ ss/=100;ll/=100; const a=ss*Math.min(ll,1-ll); const f=n=>{const k=(n+hh/30)%12;const color=ll-a*Math.max(Math.min(k-3,9-k,1),-1); return Math.round(255*color).toString(16).padStart(2,'0'); }; return `#${f(0)}${f(8)}${f(4)}`; };
  const shades = [0,1,2,3,4,5].map(i => {
    const lv = Math.min(95, Math.max(5, l - 30 + i * 14));
    const hv = hslToHex(h, s, lv);
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;" onclick="navigator.clipboard.writeText('${hv}')" title="Copy ${hv}">
      <div style="width:52px;height:52px;border-radius:9px;background:${hv};border:2px solid var(--border);"></div>
      <div style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--muted);">${hv}</div>
    </div>`;
  });
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">
    <div style="font-size:12px;color:var(--muted);">⚠️ ${sourceLabel}. ${colorName}: showing generated variants.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">${shades.join('')}</div>
    <code style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent3);">Base: HSL(${h}, ${s}%, ${l}%)</code>
  </div>`;
}

// ============================================================
// PYPI PACKAGE INFO — PyPI JSON API (free, no key)
// ============================================================
async function fetchPyPI() {
  const name = document.getElementById('pypiInput').value.trim();
  if (!name) { alert('Enter a package name!'); return; }
  const out = document.getElementById('pypiOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">🐍 Fetching PyPI data...</div>';
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
    if (!res.ok) throw new Error(`PyPI HTTP ${res.status}`);
    const d = await res.json();
    const info = d.info;
    const releases = Object.keys(d.releases||{}).filter(v => d.releases[v]?.length > 0);
    const latest = releases[releases.length-1] || info.version;
    const deps = info.requires_dist || [];
    out.innerHTML = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div style="flex:1">
            <div style="font-size:18px;font-weight:900;color:#fbbf24;font-family:'JetBrains Mono',monospace;">🐍 ${info.name}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px;line-height:1.6;">${info.summary||'No description'}</div>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(251,191,36,.1);color:#fbbf24;border:1px solid rgba(251,191,36,.3);">v${info.version}</span>
            ${info.license?`<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(16,185,129,.1);color:var(--accent3);border:1px solid rgba(16,185,129,.3);">${info.license}</span>`:''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;">
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Requires Python</div>
            <div style="font-size:14px;font-weight:800;color:#fbbf24;">${info.requires_python||'Any'}</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Total Releases</div>
            <div style="font-size:14px;font-weight:800;color:var(--accent);">${releases.length}</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Dependencies</div>
            <div style="font-size:14px;font-weight:800;color:var(--warn);">${deps.length}</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Author</div>
            <div style="font-size:12px;font-weight:700;color:var(--text);word-break:break-all;">${info.author||'N/A'}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <code style="background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 14px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#fbbf24;cursor:pointer;user-select:all;" onclick="navigator.clipboard.writeText(this.textContent);this.style.color='var(--accent3)';setTimeout(()=>this.style.color='#fbbf24',1000)" title="Click to copy">pip install ${info.name}</code>
        </div>
        ${deps.length ? `<div>
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Dependencies (${deps.length})</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">${deps.slice(0,15).map(d=>`<span style="padding:2px 8px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.15);border-radius:4px;font-size:11px;font-family:'JetBrains Mono',monospace;color:#fbbf24;">${d.split(' ')[0]}</span>`).join('')}${deps.length>15?`<span style="font-size:11px;color:var(--muted)">+${deps.length-15} more</span>`:''}</div>
        </div>` : ''}
        ${info.keywords ? `<div style="font-size:11px;color:var(--muted);">Keywords: ${info.keywords}</div>` : ''}
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="https://pypi.org/project/${info.name}/" target="_blank" style="color:#fbbf24;font-size:12px;font-weight:700;text-decoration:none;">→ PyPI Page</a>
          ${info.home_page ? `<a href="${info.home_page}" target="_blank" style="color:var(--accent);font-size:12px;font-weight:700;text-decoration:none;">🔗 Homepage</a>` : ''}
          ${info.docs_url ? `<a href="${info.docs_url}" target="_blank" style="color:var(--accent3);font-size:12px;font-weight:700;text-decoration:none;">📖 Docs</a>` : ''}
        </div>
      </div>`;
  } catch(e) {
    try {
      const res = await fetch(`https://www.piwheels.org/project/${encodeURIComponent(name)}/json`);
      if (!res.ok) throw new Error(`piwheels HTTP ${res.status}`);
      const data = await res.json();
      const versions = Object.keys(data.releases || {});
      const latest = versions[versions.length - 1] || 'unknown';
      out.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:13px;">
        <div style="font-size:15px;font-weight:900;color:#fbbf24;font-family:'JetBrains Mono',monospace;">${data.package || name}</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;">Python wheel metadata from piwheels backup.</div>
        <div style="font-size:11px;color:var(--accent);font-family:'JetBrains Mono',monospace;margin-top:6px;">piwheels backup · latest seen: ${latest} · releases: ${versions.length}</div>
        <a href="https://www.piwheels.org/project/${encodeURIComponent(data.package || name)}/" target="_blank" style="color:var(--accent);font-size:12px;font-weight:700;text-decoration:none;">Open package →</a>
      </div>`;
    } catch(e2) {
      out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ PyPI and backup package APIs unavailable.</div>`;
    }
  }
}

// ============================================================
// CRATES.IO — Rust package registry (free, no key)
// ============================================================
async function fetchCrates() {
  const name = document.getElementById('cratesInput').value.trim();
  if (!name) { alert('Enter a crate name!'); return; }
  const out = document.getElementById('cratesOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">🦀 Fetching crate info...</div>';
  try {
    const headers = { 'User-Agent': 'CodeMind/1.0' };
    const res = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`, { headers });
    if (!res.ok) { out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ Crate "${name}" not found.</div>`; return; }
    const data = await res.json();
    const c = data.crate;
    const latest = data.versions?.[0] || {};
    const dls = c.downloads ? c.downloads.toLocaleString() : 'N/A';
    const recentDls = c.recent_downloads ? c.recent_downloads.toLocaleString() : 'N/A';
    out.innerHTML = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div style="flex:1">
            <div style="font-size:18px;font-weight:900;color:#f97316;font-family:'JetBrains Mono',monospace;">🦀 ${c.name}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px;line-height:1.6;">${c.description||'No description'}</div>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(249,115,22,.1);color:#f97316;border:1px solid rgba(249,115,22,.3);">v${c.max_stable_version||c.newest_version}</span>
            ${latest.license?`<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(16,185,129,.1);color:var(--accent3);border:1px solid rgba(16,185,129,.3);">${latest.license}</span>`:''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;">
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Total Downloads</div>
            <div style="font-size:14px;font-weight:800;color:var(--accent3);">${dls}</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Recent Downloads</div>
            <div style="font-size:14px;font-weight:800;color:#f97316;">${recentDls}</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Versions</div>
            <div style="font-size:14px;font-weight:800;color:var(--accent);">${data.versions?.length||0}</div>
          </div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Updated</div>
            <div style="font-size:12px;font-weight:700;color:var(--text);">${c.updated_at?new Date(c.updated_at).toLocaleDateString():'N/A'}</div>
          </div>
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;">
          <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Add to Cargo.toml</div>
          <code style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#f97316;cursor:pointer;" onclick="navigator.clipboard.writeText(this.textContent);this.style.color='var(--accent3)';setTimeout(()=>this.style.color='#f97316',1000)">${c.name} = "${c.max_stable_version||c.newest_version}"</code>
        </div>
        ${c.keywords?.length ? `<div style="display:flex;gap:5px;flex-wrap:wrap;">${c.keywords.slice(0,10).map(k=>`<span style="padding:2px 8px;background:rgba(249,115,22,.08);border:1px solid rgba(249,115,22,.2);border-radius:4px;font-size:11px;font-family:'JetBrains Mono',monospace;color:#f97316;">${k}</span>`).join('')}</div>` : ''}
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="https://crates.io/crates/${c.name}" target="_blank" style="color:#f97316;font-size:12px;font-weight:700;text-decoration:none;">→ crates.io</a>
          ${c.documentation ? `<a href="${c.documentation}" target="_blank" style="color:var(--accent);font-size:12px;font-weight:700;text-decoration:none;">📖 Docs</a>` : `<a href="https://docs.rs/${c.name}" target="_blank" style="color:var(--accent);font-size:12px;font-weight:700;text-decoration:none;">📖 docs.rs</a>`}
          ${c.repository ? `<a href="${c.repository}" target="_blank" style="color:var(--accent3);font-size:12px;font-weight:700;text-decoration:none;">🐙 Repo</a>` : ''}
        </div>
      </div>`;
  } catch(e) {
    out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ Error: ${e.message}</div>`;
  }
}

// ============================================================
// HUGGING FACE MODELS — HF API (free, no key)
// ============================================================
async function fetchHuggingFace() {
  const query = document.getElementById('hfInput').value.trim();
  const task = (document.getElementById('hfTask') || document.getElementById('hfTaskFilter'))?.value || '';
  const out = document.getElementById('hfOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">🤗 Fetching models...</div>';
  try {
    let url = `https://huggingface.co/api/models?limit=12&sort=downloads&direction=-1`;
    if (query) url += `&search=${encodeURIComponent(query)}`;
    if (task) url += `&pipeline_tag=${encodeURIComponent(task)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HuggingFace API error');
    const models = await res.json();
    if (!models.length) { out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:30px">No models found. Try a different search.</div>'; return; }
    out.innerHTML = models.map(m => {
      const dls = m.downloads ? (m.downloads > 1e6 ? (m.downloads/1e6).toFixed(1)+'M' : m.downloads > 1e3 ? (m.downloads/1e3).toFixed(0)+'K' : m.downloads) : '0';
      const likes = m.likes || 0;
      const tags = (m.tags||[]).filter(t => !['transformers','pytorch','arxiv'].some(s=>t.startsWith(s))).slice(0,4);
      return `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:13px;transition:border-color .15s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
          <a href="https://huggingface.co/${m.modelId||m.id}" target="_blank" style="font-size:13px;font-weight:800;color:var(--accent);text-decoration:none;font-family:'JetBrains Mono',monospace;word-break:break-all;">${m.modelId||m.id}</a>
          ${m.pipeline_tag?`<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(255,161,0,.1);color:#fbbf24;border:1px solid rgba(255,161,0,.2);white-space:nowrap;">${m.pipeline_tag}</span>`:''}
        </div>
        <div style="display:flex;gap:12px;font-size:11px;font-family:'JetBrains Mono',monospace;flex-wrap:wrap;margin-bottom:6px;">
          <span style="color:var(--accent3);">⬇️ ${dls}</span>
          <span style="color:#f472b6;">❤️ ${likes.toLocaleString()}</span>
          ${m.lastModified?`<span style="color:var(--muted);">📅 ${new Date(m.lastModified).toLocaleDateString()}</span>`:''}
        </div>
        ${tags.length?`<div style="display:flex;gap:4px;flex-wrap:wrap;">${tags.map(t=>`<span style="padding:1px 6px;background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.2);border-radius:3px;font-size:10px;color:#c4b5fd;">${t}</span>`).join('')}</div>`:''}
      </div>`;
    }).join('');
  } catch(e) {
    try {
      const q = query || task || 'transformers';
      const res = await fetch(`https://paperswithcode.com/api/v1/search/?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`Papers With Code HTTP ${res.status}`);
      const data = await res.json();
      const results = data.results || [];
      if (!results.length) throw new Error('No backup results');
      out.innerHTML = results.slice(0, 12).map(m => `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:13px;">
        <a href="${m.url || '#'}" target="_blank" style="font-size:13px;font-weight:800;color:var(--accent);text-decoration:none;font-family:'JetBrains Mono',monospace;word-break:break-all;">${m.name || m.title || 'AI resource'}</a>
        <div style="font-size:11px;color:var(--muted);margin-top:5px;">Backup: Papers With Code search</div>
      </div>`).join('');
    } catch(e2) {
      out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ Model APIs unavailable.</div>`;
    }
  }
}

// ============================================================
// ML / AI PAPERS — Semantic Scholar API (free, no key)
// ============================================================
async function fetchMLPapers() {
  const query = (document.getElementById('mlPapersInput') || document.getElementById('papersInput'))?.value?.trim() || 'large language models transformers';
  const out = document.getElementById('mlPapersOutput') || document.getElementById('papersOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">📄 Fetching papers...</div>';
  try {
    const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10&fields=title,authors,year,abstract,externalIds,citationCount,openAccessPdf,venue`);
    if (!res.ok) throw new Error('Semantic Scholar API unavailable');
    const data = await res.json();
    if (!data.data?.length) { out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:30px">No papers found. Try a different query.</div>'; return; }
    out.innerHTML = data.data.map(p => {
      const authors = (p.authors||[]).slice(0,3).map(a=>a.name).join(', ') + (p.authors?.length > 3 ? ' et al.' : '');
      const abstract = p.abstract ? p.abstract.substring(0,200)+'...' : 'No abstract available.';
      const arxiv = p.externalIds?.ArXiv;
      const doi = p.externalIds?.DOI;
      return `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:7px;">
        <div style="font-size:13px;font-weight:800;color:var(--text);line-height:1.4;">${p.title}</div>
        <div style="font-size:11px;color:var(--accent);font-family:'JetBrains Mono',monospace;">${authors} · ${p.year||'N/A'} ${p.venue?`· ${p.venue}`:''}</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;">${abstract}</div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          ${p.citationCount !== undefined ? `<span style="font-size:11px;color:var(--accent3);font-family:'JetBrains Mono',monospace;">📚 ${p.citationCount.toLocaleString()} citations</span>` : ''}
          ${arxiv ? `<a href="https://arxiv.org/abs/${arxiv}" target="_blank" style="font-size:11px;color:var(--accent);font-weight:700;text-decoration:none;">arXiv →</a>` : ''}
          ${p.openAccessPdf?.url ? `<a href="${p.openAccessPdf.url}" target="_blank" style="font-size:11px;color:var(--accent3);font-weight:700;text-decoration:none;">📄 PDF →</a>` : ''}
          ${doi ? `<a href="https://doi.org/${doi}" target="_blank" style="font-size:11px;color:var(--muted);text-decoration:none;">DOI →</a>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    // Fallback to arXiv API
    try {
      const res2 = await fetch(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=10&sortBy=submittedDate&sortOrder=descending`);
      const text = await res2.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const entries = xml.querySelectorAll('entry');
      if (!entries.length) { out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:30px">No papers found.</div>'; return; }
      out.innerHTML = [...entries].map(e => {
        const title = e.querySelector('title')?.textContent?.trim() || '';
        const summary = (e.querySelector('summary')?.textContent?.trim() || '').substring(0,200)+'...';
        const authors = [...e.querySelectorAll('author name')].slice(0,3).map(a=>a.textContent).join(', ');
        const link = e.querySelector('id')?.textContent?.trim() || '';
        const published = e.querySelector('published')?.textContent?.trim().split('T')[0] || '';
        return `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:7px;">
          <a href="${link}" target="_blank" style="font-size:13px;font-weight:800;color:var(--text);text-decoration:none;line-height:1.4;">${title}</a>
          <div style="font-size:11px;color:var(--accent);font-family:'JetBrains Mono',monospace;">${authors} · ${published}</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.6;">${summary}</div>
          <a href="${link}" target="_blank" style="font-size:11px;color:var(--accent3);font-weight:700;text-decoration:none;">arXiv →</a>
        </div>`;
      }).join('');
    } catch(e2) {
      out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ ${e.message}</div>`;
    }
  }
}
