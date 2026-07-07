// ============================================================
// DEVTOOLS FEATURES
// ============================================================

// --- Pomodoro ---
let pomoInterval = null, pomoRunning = false, pomoMode = 'focus', pomoTotal = 25*60, pomoLeft = 25*60;
function pomoStart() {
  if (pomoRunning) return;
  pomoRunning = true;
  document.getElementById('pomoStartBtn').style.display = 'none';
  document.getElementById('pomoPauseBtn').style.display = '';
  pomoInterval = setInterval(() => {
    pomoLeft--;
    if (pomoLeft <= 0) {
      clearInterval(pomoInterval);
      pomoRunning = false;
      document.getElementById('pomoStartBtn').style.display = '';
      document.getElementById('pomoPauseBtn').style.display = 'none';
      showNotification(pomoMode === 'focus' ? '🎉 Focus session done! Take a break.' : '☕ Break over! Back to work.', 'ok');
      return;
    }
    updatePomoDisplay();
  }, 1000);
}
function pomoPause() {
  clearInterval(pomoInterval);
  pomoRunning = false;
  document.getElementById('pomoStartBtn').style.display = '';
  document.getElementById('pomoPauseBtn').style.display = 'none';
}
function pomoReset() {
  pomoPause();
  pomoLeft = pomoTotal;
  updatePomoDisplay();
}
function togglePomoMode() {
  pomoPause();
  if (pomoMode === 'focus') {
    pomoMode = 'break'; pomoTotal = 5*60; pomoLeft = 5*60;
    document.getElementById('pomoLabel').textContent = 'Short Break';
    document.getElementById('pomoModeBtn').textContent = '⚡ Focus';
  } else {
    pomoMode = 'focus'; pomoTotal = 25*60; pomoLeft = 25*60;
    document.getElementById('pomoLabel').textContent = 'Focus Session';
    document.getElementById('pomoModeBtn').textContent = '☕ Break';
  }
  updatePomoDisplay();
}
function updatePomoDisplay() {
  const m = String(Math.floor(pomoLeft/60)).padStart(2,'0');
  const s = String(pomoLeft%60).padStart(2,'0');
  document.getElementById('pomoTime').textContent = `${m}:${s}`;
  const pct = (pomoLeft / pomoTotal) * 100;
  document.getElementById('pomoBar').style.width = pct + '%';
  document.title = pomoRunning ? `${m}:${s} — CodeMind` : 'CodeMind — AI Coding Assistant';
}

// --- Color Converter ---
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return {r,g,b};
}
function rgbToHsl(r,g,b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if(max===min){h=s=0;}else{
    const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}
  }
  return {h:Math.round(h*360),s:Math.round(s*100),l:Math.round(l*100)};
}
function updateColor(hex) {
  if (!hex.match(/^#[0-9a-f]{6}$/i)) return;
  document.getElementById('colorPicker').value = hex;
  document.getElementById('colorHexInput').value = hex;
  const {r,g,b} = hexToRgb(hex);
  const {h,s,l} = rgbToHsl(r,g,b);
  const fmt = document.getElementById('colorFormats');
  const formats = [
    ['HEX', hex.toUpperCase()],
    ['RGB', `rgb(${r}, ${g}, ${b})`],
    ['HSL', `hsl(${h}, ${s}%, ${l}%)`],
    ['RGBA', `rgba(${r}, ${g}, ${b}, 1)`],
    ['CSS var', `--color: ${hex.toUpperCase()};`],
    ['Tailwind-ish', `bg-[${hex.toUpperCase()}]`],
  ];
  fmt.innerHTML = formats.map(([label, val]) => `
    <div class="color-fmt-row">
      <span class="color-fmt-label">${label}</span>
      <input class="color-fmt-val" readonly value="${val}" onclick="navigator.clipboard.writeText('${val}');showNotification('✅ Copied ${label}','ok')"/>
    </div>`).join('');
  // Render palette
  const canvas = document.getElementById('colorPaletteCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth || 300;
  canvas.height = 24;
  const shades = 10;
  for (let i = 0; i < shades; i++) {
    const factor = (i / (shades-1));
    const lr = Math.round(r + (255-r)*factor*(1-factor*0.3));
    const lg = Math.round(g + (255-g)*factor*(1-factor*0.3));
    const lb = Math.round(b + (255-b)*factor*(1-factor*0.3));
    ctx.fillStyle = `rgb(${i<5?r*(1-factor*1.8):lr},${i<5?g*(1-factor*1.8):lg},${i<5?b*(1-factor*1.8):lb})`;
    ctx.fillRect(i * (canvas.width/shades), 0, canvas.width/shades, 24);
  }
}
function onColorHexInput(v) {
  const hex = v.startsWith('#') ? v : '#'+v;
  if (hex.match(/^#[0-9a-f]{6}$/i)) updateColor(hex);
}

// --- Base64 ---
function b64Encode() {
  try { document.getElementById('b64Output').textContent = btoa(unescape(encodeURIComponent(document.getElementById('b64Input').value))); }
  catch(e) { document.getElementById('b64Output').textContent = '❌ ' + e.message; }
}
function b64Decode() {
  try { document.getElementById('b64Output').textContent = decodeURIComponent(escape(atob(document.getElementById('b64Input').value.trim()))); }
  catch(e) { document.getElementById('b64Output').textContent = '❌ Invalid Base64'; }
}
function b64Clear() { document.getElementById('b64Input').value=''; document.getElementById('b64Output').textContent='Result will appear here...'; }

// --- URL Encoder ---
function urlEncode() { document.getElementById('urlOutput').textContent = encodeURIComponent(document.getElementById('urlInput').value); }
function urlDecode() { try { document.getElementById('urlOutput').textContent = decodeURIComponent(document.getElementById('urlInput').value); } catch(e) { document.getElementById('urlOutput').textContent = '❌ ' + e.message; } }

// --- JSON ---
function jsonFormat() {
  try {
    const parsed = JSON.parse(document.getElementById('jsonInput').value);
    document.getElementById('jsonOutput').textContent = JSON.stringify(parsed, null, 2);
    document.getElementById('jsonOutput').style.color = 'var(--accent3)';
  } catch(e) { document.getElementById('jsonOutput').textContent = '❌ ' + e.message; document.getElementById('jsonOutput').style.color = 'var(--danger)'; }
}
function jsonMinify() {
  try {
    document.getElementById('jsonOutput').textContent = JSON.stringify(JSON.parse(document.getElementById('jsonInput').value));
    document.getElementById('jsonOutput').style.color = 'var(--accent3)';
  } catch(e) { document.getElementById('jsonOutput').textContent = '❌ ' + e.message; document.getElementById('jsonOutput').style.color = 'var(--danger)'; }
}
function jsonValidate() {
  try { JSON.parse(document.getElementById('jsonInput').value); document.getElementById('jsonOutput').textContent = '✅ Valid JSON!'; document.getElementById('jsonOutput').style.color = 'var(--accent3)'; }
  catch(e) { document.getElementById('jsonOutput').textContent = '❌ Invalid: ' + e.message; document.getElementById('jsonOutput').style.color = 'var(--danger)'; }
}
function jsonToEditor() {
  try {
    const v = document.getElementById('jsonOutput').textContent;
    if (v && !v.startsWith('❌') && !v.startsWith('✅')) { document.getElementById('codeEditor').value = v; switchTab('code'); showNotification('✅ JSON sent to editor','ok'); }
  } catch(e) {}
}

// --- Hash ---
async function genHash(algo) {
  const text = document.getElementById('hashInput').value;
  if (!text) { document.getElementById('hashOutput').textContent = '⚠️ Enter text to hash'; return; }
  try {
    const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
    const hex = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    document.getElementById('hashOutput').textContent = hex;
  } catch(e) { document.getElementById('hashOutput').textContent = '❌ ' + e.message; }
}

// --- GitHub Profile (free GitHub API) ---
async function lookupGhProfile() {
  const user = document.getElementById('ghProfileInput').value.trim();
  if (!user) return;
  if (!/^[A-Za-z0-9-]{1,39}$/.test(user)) {
    document.getElementById('ghProfileResult').innerHTML = '<div style="color:var(--danger);font-size:11px">❌ GitHub username format only: letters, numbers, and hyphen. Example: torvalds</div>';
    return;
  }
  const box = document.getElementById('ghProfileResult');
  box.innerHTML = '<div style="color:var(--muted);font-size:11px">Loading...</div>';
  try {
    const [u, repos] = window.CodeMindSafety
      ? await Promise.all([
          CodeMindSafety.fetchJson(`https://api.github.com/users/${encodeURIComponent(user)}`, {}, 'GitHub Profile API'),
          CodeMindSafety.fetchJson(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=5&sort=stars`, {}, 'GitHub Repos API').catch(() => [])
        ])
      : await Promise.all([
          fetch(`https://api.github.com/users/${encodeURIComponent(user)}`).then(r => r.json()),
          fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=5&sort=stars`).then(r => r.ok ? r.json() : [])
        ]);
    const topRepos = repos.slice(0,4).map(r=>`
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
        <a href="${r.html_url}" target="_blank" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent);text-decoration:none">${r.name}</a>
        <span style="font-size:10px;color:var(--muted)">⭐ ${r.stargazers_count}</span>
      </div>`).join('');
    box.innerHTML = `
      <div class="gh-profile-row">
        <img src="${u.avatar_url}" class="gh-avatar" onerror="this.style.display='none'"/>
        <div><div class="gh-username">${u.login}</div><div class="gh-bio">${u.bio||'No bio'}</div></div>
      </div>
      <div class="gh-stats-grid">
        <div class="gh-stat"><div class="gh-stat-val">${u.public_repos}</div><div class="gh-stat-label">Repos</div></div>
        <div class="gh-stat"><div class="gh-stat-val">${u.followers}</div><div class="gh-stat-label">Followers</div></div>
        <div class="gh-stat"><div class="gh-stat-val">${u.following}</div><div class="gh-stat-label">Following</div></div>
      </div>
      ${topRepos ? `<div style="margin-top:6px"><div style="font-size:10px;color:var(--muted);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Top Repos</div>${topRepos}</div>` : ''}
    `;
  } catch(e) {
    const msg = window.CodeMindSafety ? CodeMindSafety.explainError(e, 'GitHub Profile API') : e.message;
    box.innerHTML = `<div style="color:var(--danger);font-size:11px">❌ ${msg}<br/><span style="color:var(--muted)">Input format: username only, for example torvalds.</span></div>`;
  }
}

// --- Timestamp ---
function convertTimestamp() {
  const v = document.getElementById('tsInput').value.trim();
  const out = document.getElementById('tsOutput');
  if (!v) return;
  let d;
  if (/^\d{9,10}$/.test(v)) d = new Date(parseInt(v) * 1000);
  else if (/^\d{13}$/.test(v)) d = new Date(parseInt(v));
  else d = new Date(v);
  if (isNaN(d)) { out.textContent = '❌ Invalid date/timestamp'; return; }
  out.textContent = [
    `Unix (s):   ${Math.floor(d.getTime()/1000)}`,
    `Unix (ms):  ${d.getTime()}`,
    `ISO 8601:   ${d.toISOString()}`,
    `UTC:        ${d.toUTCString()}`,
    `Local:      ${d.toLocaleString()}`,
    `Relative:   ${getRelativeTime(d)}`,
  ].join('\n');
}
function getRelativeTime(d) {
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const suffix = diff > 0 ? 'ago' : 'from now';
  if (abs < 60000) return `${Math.round(abs/1000)}s ${suffix}`;
  if (abs < 3600000) return `${Math.round(abs/60000)}m ${suffix}`;
  if (abs < 86400000) return `${Math.round(abs/3600000)}h ${suffix}`;
  return `${Math.round(abs/86400000)}d ${suffix}`;
}

// --- Copy DevTools output ---
function copyDt(id) {
  const v = document.getElementById(id).textContent;
  navigator.clipboard.writeText(v).then(() => showNotification('✅ Copied!','ok'));
}

