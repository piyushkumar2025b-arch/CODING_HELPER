// ============================================================
// GITHUB STATUS
// ============================================================
function updateGhStatus() {
  const dot = document.getElementById('ghDot');
  const txt = document.getElementById('ghText');
  if (ghToken) { dot.classList.add('connected'); txt.textContent = 'Gist ✓'; }
  else { dot.classList.remove('connected'); txt.textContent = 'Gist'; }
}

function openGistModal() {
  document.getElementById('ghTokenInput').value = ghToken;
  document.getElementById('gistUrlInput').value = '';
  openModal('gistModal');
  if (ghToken) loadMyGists();
}

// ============================================================
// GITHUB GIST API
// ============================================================
async function saveAsGist() {
  const token = document.getElementById('ghTokenInput').value.trim();
  if (token) { ghToken = token; localStorage.setItem('cm_gh_token', token); updateGhStatus(); }
  if (!ghToken) { alert('Please enter a GitHub Personal Access Token.'); return; }

  const code = document.getElementById('codeEditor').value.trim();
  if (!code) { alert('No code in editor to save!'); return; }

  const ext = { javascript:'js', python:'py', typescript:'ts', java:'java', cpp:'cpp', c:'c',
    csharp:'cs', go:'go', rust:'rs', kotlin:'kt', swift:'swift', ruby:'rb', php:'php',
    html:'html', scala:'scala', r:'r', dart:'dart' }[currentLang] || 'txt';
  const filename = `codemind_snippet.${ext}`;

  try {
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ghToken}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github+json' },
      body: JSON.stringify({ description: `CodeMind ${LANG_LABELS[currentLang]} snippet`, public: false,
        files: { [filename]: { content: code } } })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gist save failed');
    closeModal('gistModal');
    const msg = `✅ Gist saved!\n🔗 ${data.html_url}`;
    showNotification(msg, 'ok');
  } catch(e) {
    showNotification('❌ ' + e.message, 'err');
  }
}

async function loadMyGists() {
  if (!ghToken) return;
  const list = document.getElementById('gistList');
  try {
    const res = await fetch('https://api.github.com/gists?per_page=10', {
      headers: { 'Authorization': `Bearer ${ghToken}`, 'Accept': 'application/vnd.github+json' }
    });
    if (!res.ok) {
      const reason = res.status === 401 ? 'Token expired or invalid.' :
                     res.status === 403 ? 'Token lacks gist scope.' :
                     `HTTP ${res.status}`;
      list.innerHTML = `<div style="color:var(--danger);font-size:11px;padding:5px">❌ Could not load gists: ${reason}</div>`;
      return;
    }
    const gists = await res.json();
    if (!Array.isArray(gists) || gists.length === 0) {
      list.innerHTML = '<div style="color:var(--muted);font-size:11px;padding:5px">No gists found.</div>';
      return;
    }
    list.innerHTML = gists.map(g => {
      const fname = Object.keys(g.files)[0];
      return `<div class="gist-item" onclick="loadGistById('${g.id}')">
        <div><div class="gist-item-name">${fname}</div><div class="gist-item-meta">${(g.description||'').slice(0,50) || 'No description'}</div></div>
        <button class="gist-load-btn" onclick="event.stopPropagation();loadGistById('${g.id}')">Load</button>
      </div>`;
    }).join('');
  } catch(e) {
    list.innerHTML = `<div style="color:var(--danger);font-size:11px;padding:5px">❌ Network error: ${e.message}</div>`;
  }
}

async function loadGistFromUrl() {
  const raw = document.getElementById('gistUrlInput').value.trim();
  if (!raw) return;
  const id = raw.split('/').pop().split('#')[0];
  await loadGistById(id);
}

async function loadGistById(id) {
  try {
    const headers = ghToken ? { 'Authorization': `Bearer ${ghToken}`, 'Accept': 'application/vnd.github+json' } : {};
    const res = await fetch(`https://api.github.com/gists/${id}`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Load failed');
    const fname = Object.keys(data.files)[0];
    const content = data.files[fname].content;
    document.getElementById('codeEditor').value = content;
    closeModal('gistModal');
    switchTab('code');
    showNotification(`✅ Loaded "${fname}" from Gist`, 'ok');
  } catch(e) {
    showNotification('❌ ' + e.message, 'err');
  }
}

// ============================================================
// NOTIFICATION TOAST
// ============================================================
function showNotification(msg, type) {
  let toast = document.getElementById('cm-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cm-toast';
    toast.style.cssText = `position:fixed;bottom:40px;right:20px;z-index:999;padding:10px 16px;border-radius:9px;
      font-family:'JetBrains Mono',monospace;font-size:12px;max-width:340px;line-height:1.5;
      border:1px solid;animation:fadeIn .2s ease;backdrop-filter:blur(10px);`;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = type === 'ok' ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)';
  toast.style.borderColor = type === 'ok' ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)';
  toast.style.color = type === 'ok' ? '#6ee7b7' : '#f38ba8';
  toast.style.display = 'block';
  clearTimeout(toast._to);
  toast._to = setTimeout(() => { toast.style.display = 'none'; }, 4500);
}

// ============================================================
// CODE FORMATTER (Prettier)
// ============================================================
async function formatCode() {
  const editor = document.getElementById('codeEditor');
  const code = editor.value;
  if (!code.trim()) return;
  const btn = document.getElementById('fmtBtn');
  btn.textContent = '⏳';
  btn.disabled = true;
  try {
    const parserMap = { javascript:'babel', typescript:'typescript', html:'html', css:'css', json:'json' };
    const parser = parserMap[currentLang];
    if (!parser) { showNotification(`⚠️ Prettier doesn't support ${LANG_LABELS[currentLang]} — try JS, TS, or HTML.`, 'warn'); return; }
    const plugins = [prettierPlugins.babel, prettierPlugins.html, prettierPlugins.typescript, prettierPlugins.postcss].filter(Boolean);
    const formatted = await prettier.format(code, { parser, plugins, semi: true, singleQuote: true, tabWidth: 2, printWidth: 100 });
    editor.value = formatted;
    showNotification('✅ Code formatted with Prettier!', 'ok');
  } catch(e) {
    showNotification('❌ Format error: ' + e.message.split('\n')[0], 'err');
  } finally {
    btn.textContent = '✨ Format';
    btn.disabled = false;
  }
}

// ============================================================
// CODE REVIEW MODE
// ============================================================
async function reviewCurrentCode() {
  const code = document.getElementById('codeEditor').value.trim();
  if (!code) { alert('No code to review!'); return; }
  document.getElementById('codeInput').value = code;
  setMode('review');
  await askAI();
}

// ============================================================
// NPM SEARCH (npmjs registry API)
// ============================================================
async function npmSearch() {
  const q = document.getElementById('npmSearchInput').value.trim();
  if (!q) return;
  const box = document.getElementById('npmResults');
  box.innerHTML = '<div style="color:var(--muted);font-size:10px;padding:3px">Searching...</div>';
  try {
    const res = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=5`);
    const data = await res.json();
    if (!data.objects?.length) { box.innerHTML = '<div style="color:var(--muted);font-size:10px;padding:3px">No results.</div>'; return; }
    box.innerHTML = data.objects.map(o => {
      const p = o.package;
      return `<div class="npm-result" onclick="insertNpmImport('${p.name}')">
        <div class="npm-result-name">${p.name}</div>
        <div class="npm-result-desc">${(p.description||'').slice(0,70)}</div>
        <div class="npm-result-meta">v${p.version} · ⭐ ${(p.downloads?.monthly||0).toLocaleString()}/mo</div>
      </div>`;
    }).join('');
  } catch(e) {
    box.innerHTML = '<div style="color:var(--danger);font-size:10px;padding:3px">Search failed</div>';
  }
}

function insertNpmImport(pkg) {
  const editor = document.getElementById('codeEditor');
  const lang = currentLang;
  let imp = '';
  if (lang === 'javascript' || lang === 'typescript') imp = `import ${pkg.replace(/-./g, x=>x[1].toUpperCase())} from '${pkg}';\n`;
  else if (lang === 'python') imp = `import ${pkg.replace(/-/g,'_')}\n`;
  else imp = `// ${pkg}\n`;
  editor.value = imp + editor.value;
  switchTab('code');
  showNotification(`✅ Added import for "${pkg}"`, 'ok');
}

