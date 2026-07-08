// ============================================================
// DOCS / MDN SEARCH
// ============================================================
let docsSource = 'mdn';

function setDocsSource(src, el) {
  docsSource = src;
  document.querySelectorAll('.docs-source-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

async function searchDocs() {
  const query = document.getElementById('docsInput').value.trim();
  if (!query) return;
  const box = document.getElementById('docsResults');
  box.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:30px">🔍 Searching...</div>';

  if (docsSource === 'mdn') {
    await searchMDN(query, box);
  } else if (docsSource === 'caniuse') {
    await searchCaniuse(query, box);
  } else {
    await searchDevDocs(query, box);
  }
}

async function searchMDN(query, box) {
  try {
    const data = window.CodeMindSafety
      ? await CodeMindSafety.fetchJson(`https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=en-US`, {}, 'MDN Docs API')
      : await (await fetch(`https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=en-US`)).json();
    if (!data.documents?.length) {
      box.innerHTML = '<div style="color:var(--muted);text-align:center;padding:30px">No MDN results found. Try a different term.</div>';
      return;
    }
    box.innerHTML = data.documents.slice(0,8).map(d => `
      <div class="docs-result-card">
        <div class="docs-result-title"><a href="https://developer.mozilla.org${d.mdn_url}" target="_blank">${d.title}</a></div>
        <div class="docs-result-desc">${d.summary || ''}</div>
        <div class="docs-result-meta">📘 MDN · ${d.mdn_url}</div>
      </div>`).join('');
  } catch(e) {
    const msg = window.CodeMindSafety ? CodeMindSafety.explainError(e, 'MDN Docs API') : e.message;
    box.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ ${msg}. Try DevDocs instead.<br/><span style="color:var(--muted);font-size:11px">Input format: docs keyword only, for example CSS grid or Array.prototype.map.</span></div>`;
  }
}

async function searchCaniuse(query, box) {
  // Can I Use doesn't have a free JSON search API — use DevDocs caniuse endpoint or provide a static known-data lookup
  const q = query.toLowerCase();
  const features = [
    { name:'CSS Grid', slug:'css-grid', support:'96%', url:'https://caniuse.com/css-grid' },
    { name:'CSS Flexbox', slug:'flexbox', support:'99%', url:'https://caniuse.com/flexbox' },
    { name:'CSS Variables (Custom Properties)', slug:'css-variables', support:'96%', url:'https://caniuse.com/css-variables' },
    { name:'Web Animations API', slug:'web-animation', support:'83%', url:'https://caniuse.com/web-animation' },
    { name:'Fetch API', slug:'fetch', support:'97%', url:'https://caniuse.com/fetch' },
    { name:'CSS Container Queries', slug:'css-container-queries', support:'90%', url:'https://caniuse.com/css-container-queries' },
    { name:'CSS :has() selector', slug:'css-has', support:'88%', url:'https://caniuse.com/css-has' },
    { name:'CSS Subgrid', slug:'css-subgrid', support:'85%', url:'https://caniuse.com/css-subgrid' },
    { name:'View Transitions API', slug:'view-transitions', support:'75%', url:'https://caniuse.com/view-transitions' },
    { name:'CSS Nesting', slug:'css-nesting', support:'87%', url:'https://caniuse.com/css-nesting' },
    { name:'CSS Cascade Layers', slug:'css-cascade-layers', support:'90%', url:'https://caniuse.com/css-cascade-layers' },
    { name:'CSS Scroll Snap', slug:'css-snappoints', support:'96%', url:'https://caniuse.com/css-snappoints' },
    { name:'CSS backdrop-filter', slug:'css-backdrop-filter', support:'91%', url:'https://caniuse.com/css-backdrop-filter' },
    { name:'CSS color-mix()', slug:'css-color-mix', support:'83%', url:'https://caniuse.com/?search=color-mix' },
    { name:'CSS logical properties', slug:'css-logical-properties', support:'92%', url:'https://caniuse.com/?search=logical%20properties' },
    { name:'CSS clamp()', slug:'css-clamp', support:'95%', url:'https://caniuse.com/?search=clamp' },
    { name:'CSS min()/max()', slug:'css-minmax', support:'96%', url:'https://caniuse.com/?search=min%20max' },
    { name:'CSS grid template areas', slug:'css-grid-template-areas', support:'96%', url:'https://caniuse.com/css-grid' },
    { name:'Pointer Events', slug:'pointer-events', support:'97%', url:'https://caniuse.com/pointer-events' },
    { name:'IntersectionObserver', slug:'intersectionobserver', support:'97%', url:'https://caniuse.com/intersectionobserver' },
    { name:'ResizeObserver', slug:'resizeobserver', support:'97%', url:'https://caniuse.com/resizeobserver' },
    { name:'WebP image format', slug:'webp', support:'97%', url:'https://caniuse.com/webp' },
    { name:'AVIF image format', slug:'avif', support:'91%', url:'https://caniuse.com/avif' },
    { name:'CSS aspect-ratio', slug:'mdn-css_properties_aspect-ratio', support:'95%', url:'https://caniuse.com/mdn-css_properties_aspect-ratio' },
    { name:'Scroll Snap', slug:'css-snappoints', support:'96%', url:'https://caniuse.com/css-snappoints' },
    { name:'Web Components / Custom Elements', slug:'custom-elementsv1', support:'95%', url:'https://caniuse.com/custom-elementsv1' },
    { name:'Service Workers', slug:'serviceworkers', support:'97%', url:'https://caniuse.com/serviceworkers' },
    { name:'WebSocket', slug:'websockets', support:'98%', url:'https://caniuse.com/websockets' },
    { name:'ES Modules (dynamic import)', slug:'es6-module-dynamic-import', support:'95%', url:'https://caniuse.com/es6-module-dynamic-import' },
  ];
  const matches = features.filter(f => f.name.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q));
  if (!matches.length) {
    box.innerHTML = `<div style="color:var(--muted);text-align:center;padding:30px">No local results found. <a href="https://caniuse.com/?search=${encodeURIComponent(query)}" target="_blank" style="color:var(--accent)">Search caniuse.com directly →</a></div>`;
    return;
  }
  box.innerHTML = matches.map(f => {
    const pct = parseInt(f.support);
    const col = pct >= 95 ? 'var(--accent3)' : pct >= 80 ? 'var(--warn)' : 'var(--danger)';
    return `<div class="docs-result-card">
      <div class="docs-result-title"><a href="${f.url}" target="_blank">${f.name}</a></div>
      <div style="display:flex;align-items:center;gap:10px;margin:6px 0;">
        <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
          <div style="width:${f.support};height:100%;background:${col};border-radius:3px"></div>
        </div>
        <span style="font-size:12px;color:${col};font-family:'JetBrains Mono',monospace;font-weight:700">${f.support} global support</span>
      </div>
      <div class="docs-result-meta">🌐 Can I Use · ${f.slug}</div>
    </div>`;
  }).join('');
}

async function searchDevDocs(query, box) {
  try {
    const data = window.CodeMindSafety
      ? await CodeMindSafety.fetchJson(`https://devdocs.io/search?q=${encodeURIComponent(query)}`, {}, 'DevDocs API')
      : await (await fetch(`https://devdocs.io/search?q=${encodeURIComponent(query)}`)).json();
    if (!data.results?.length) {
      box.innerHTML = `<div style="color:var(--muted);text-align:center;padding:30px">No DevDocs results. <a href="https://devdocs.io/#q=${encodeURIComponent(query)}" target="_blank" style="color:var(--accent)">Open DevDocs →</a></div>`;
      return;
    }
    box.innerHTML = data.results.slice(0,8).map(r => `
      <div class="docs-result-card">
        <div class="docs-result-title"><a href="https://devdocs.io${r.path}" target="_blank">${r.name}</a></div>
        <div class="docs-result-desc">${r.excerpt || ''}</div>
        <div class="docs-result-meta">📗 DevDocs · ${r.type || ''}</div>
      </div>`).join('');
  } catch(e) {
    const msg = window.CodeMindSafety ? CodeMindSafety.explainError(e, 'DevDocs API') : e.message;
    box.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ ${msg}. <a href="https://devdocs.io/#q=${encodeURIComponent(query)}" target="_blank" style="color:var(--accent)">Open DevDocs →</a><br/><span style="color:var(--muted);font-size:11px">Input format: docs keyword only, for example fetch API or Python list.</span></div>`;
  }
}
