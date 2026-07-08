
function setAICRLang(el, lang) {
  aicrLang = lang;
  document.querySelectorAll('#panel-aicoderev .opt-btn').forEach(b => {
    if (['auto','python','javascript','typescript','java','cpp','rust','go','sql'].includes(b.textContent.toLowerCase().replace(/[^a-z]/g,'')) ||
        b.id?.startsWith('aicr-lang')) b.classList.remove('active');
  });
  el.classList.add('active');
}

function toggleAICRFocus(el, focus) {
  aicrFocus = focus;
  document.querySelectorAll('[id^="aicr-focus-"]').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

async function runAICodeReview() {
  const code = document.getElementById('aicrInput').value.trim();
  if (!code) { alert('Paste code to review!'); return; }
  if (!apiKey) { openModal('apiModal'); return; }
  const btn = document.getElementById('aicrBtn');
  btn.disabled = true; btn.textContent = '⏳ Analysing...';
  const out = document.getElementById('aicrOutput');
  out.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center">🤖 Running deep code review...</div>';
  const lang = aicrLang === 'auto' ? currentLang : aicrLang;
  const focusInstructions = {
    all: 'Provide a comprehensive review covering bugs, security, performance, code style, maintainability, and best practices.',
    security: 'Focus primarily on security vulnerabilities: injection attacks, unsafe deserialization, hardcoded secrets, XSS, CSRF, auth issues, insecure dependencies, and OWASP Top 10.',
    performance: 'Focus on performance: time/space complexity, unnecessary re-renders, N+1 queries, memory leaks, blocking operations, and optimization opportunities.',
    style: 'Focus on code style, readability, naming conventions, code organization, and adherence to language/framework best practices.',
    bugs: 'Focus on finding actual bugs: off-by-one errors, null dereferences, race conditions, logic errors, edge cases, and incorrect assumptions.',
    ml: 'Focus on ML/AI best practices: data leakage, overfitting, proper train/val/test splits, normalization, reproducibility, gradient issues, and model evaluation.',
    db: 'Focus on database/query review: SQL injection risks, missing indexes, N+1 queries, transaction management, and query optimization.',
  };
  const prompt = `You are a senior software engineer and code reviewer. ${focusInstructions[aicrFocus]||focusInstructions.all}

Review this ${lang} code and provide a structured analysis:

\`\`\`${lang}
${code}
\`\`\`

Structure your review with these sections:
## 📊 Overall Score
Rate 1-10 with brief justification.

## 🐛 Bugs & Issues
List actual bugs or potential errors with line references if possible.

## ⚡ Performance
Identify bottlenecks, complexity issues, and quick wins.

## 🔒 Security
Flag security vulnerabilities or risky patterns.

## ✨ Code Quality
Comments on readability, naming, structure, DRY principles.

## ✅ What's Good
Highlight well-written parts.

## 🔧 Recommendations
Top 3-5 concrete, actionable improvements with code examples.

Be specific and constructive. Include short code snippets for improvements.`;
  try {
    const { text } = await callGemini('You are a rigorous code reviewer who gives honest, constructive, and detailed feedback.', prompt);
    out.innerHTML = renderMarkdown(text);
    // Add copy button
    const copyDiv = document.createElement('div');
    copyDiv.style.cssText = 'margin-top:10px;display:flex;gap:8px;';
    copyDiv.innerHTML = `<button onclick="navigator.clipboard.writeText(document.getElementById('aicrInput').value)" style="padding:6px 14px;border-radius:6px;background:var(--bg3);border:1px solid var(--border);color:var(--muted);font-size:11px;cursor:pointer;">📋 Copy Code</button>
      <button onclick="navigator.clipboard.writeText(this.closest('#aicrOutput').innerText)" style="padding:6px 14px;border-radius:6px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);color:var(--accent3);font-size:11px;cursor:pointer;">📋 Copy Review</button>`;
    out.appendChild(copyDiv);
  } catch(e) {
    out.innerHTML = `<div style="color:var(--danger);padding:20px;text-align:center">❌ ${e.message}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = '🤖 Run Deep Code Review';
  }
}

// ============================================================
// BIG-O CHART — AI explain feature
// ============================================================
async function aiExplainBigO() {
  const q = document.getElementById('bigOAskInput').value.trim();
  if (!q) { alert('Enter a question about algorithm complexity!'); return; }
  if (!apiKey) { openModal('apiModal'); return; }
  const out = document.getElementById('bigOAiOutput');
  out.style.display = '';
  out.innerHTML = '<span style="color:var(--muted)">🤖 Thinking...</span>';
  try {
    const { text } = await callGemini(
      'You are an expert in algorithm analysis and computational complexity. Give clear, concise, and accurate explanations with examples.',
      `${q}\n\nProvide: 1) Clear explanation with Big O notation, 2) A concrete example in JavaScript or Python, 3) Tips for remembering/applying it.`
    );
    out.innerHTML = renderMarkdown(text);
  } catch(e) {
    out.innerHTML = `<span style="color:var(--danger)">❌ ${e.message}</span>`;
  }
}

// ============================================================
// NEW API: REST COUNTRIES — restcountries.com (free, no key)
// ============================================================
async function fetchCountryInfo() {
  const input = document.getElementById('countryInput')?.value?.trim();
  if (!input) return;
  const out = document.getElementById('countryOutput');
  if (!out) return;
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">🌍 Fetching country data...</div>';
  try {
    const data = window.CodeMindSafety
      ? await CodeMindSafety.fetchJson(`https://restcountries.com/v3.1/name/${encodeURIComponent(input)}?fullText=false`, {}, 'Country API')
      : await (await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(input)}?fullText=false`)).json();
    const c = data[0];
    if (!c) throw new Error('No country matched. Use country names only, like India or Japan.');
    const langs = Object.values(c.languages||{}).join(', ');
    const currencies = Object.values(c.currencies||{}).map(x=>`${x.name} (${x.symbol||'?'})`).join(', ');
    out.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <span style="font-size:52px;">${c.flag||c.flags?.png?`<img src="${c.flags?.png}" style="height:40px;border-radius:4px;border:1px solid var(--border)"/>`:''}</span>
        <div>
          <div style="font-size:20px;font-weight:900;color:var(--text);">${c.name?.common}</div>
          <div style="font-size:12px;color:var(--muted);">${c.name?.official}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:7px;">
        ${[['🌆 Capital', (c.capital||[]).join(', ')],['🌍 Region', `${c.region} — ${c.subregion||''}`],['👥 Population', (c.population||0).toLocaleString()],['📐 Area', `${(c.area||0).toLocaleString()} km²`],['🗣️ Languages', langs],['💱 Currency', currencies],['🌐 TLD', (c.tld||[]).join(', ')],['📞 Calling Code', `+${(c.idd?.root||'')}${(c.idd?.suffixes||[]).join('/')}`],['🚗 Drive Side', c.car?.side||'N/A'],['⏰ Timezones', (c.timezones||[]).slice(0,3).join(', ')]].filter(([,v])=>v).map(([l,v])=>`
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:8px 10px;">
            <div style="font-size:9px;font-weight:700;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:2px;">${l}</div>
            <div style="font-size:12px;font-family:'JetBrains Mono',monospace;color:var(--text);">${v}</div>
          </div>`).join('')}
      </div>
      ${c.maps?.googleMaps?`<a href="${c.maps.googleMaps}" target="_blank" style="color:var(--accent);font-size:12px;font-weight:700;text-decoration:none;">📍 View on Google Maps →</a>`:''}
    </div>`;
  } catch(e) {
    const msg = window.CodeMindSafety ? CodeMindSafety.explainError(e, 'Country API') : e.message;
    out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ ${msg}<br/><span style="color:var(--muted);font-size:11px">Input format: country name only, for example India, Japan, United States.</span></div>`;
  }
}

// ============================================================
// NEW API: OPEN TRIVIA DB — opentdb.com (free, no key)
// ============================================================
async function fetchTrivia() {
  const amount = window.CodeMindSafety ? CodeMindSafety.numberInRange('triviaAmount', 1, 20, 5) : parseInt(document.getElementById('triviaAmount')?.value||5);
  const category = document.getElementById('triviaCategory')?.value||'';
  const difficulty = document.getElementById('triviaDifficulty')?.value||'';
  const out = document.getElementById('triviaOutput');
  if (!out) return;
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">🎲 Loading trivia questions...</div>';
  try {
    let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple&encode=url3986`;
    if (category) url += `&category=${category}`;
    if (difficulty) url += `&difficulty=${difficulty}`;
    const data = window.CodeMindSafety ? await CodeMindSafety.fetchJson(url, {}, 'Trivia API') : await (await fetch(url)).json();
    if (data.response_code !== 0 || !data.results?.length) throw new Error('No questions available');
    out.innerHTML = data.results.map((q, idx) => {
      const allAnswers = [...q.incorrect_answers, q.correct_answer].map(decodeURIComponent);
      allAnswers.sort(() => Math.random() - 0.5);
      const correctIdx = allAnswers.indexOf(decodeURIComponent(q.correct_answer));
      const dc = q.difficulty === 'easy' ? 'var(--accent3)' : q.difficulty === 'medium' ? 'var(--warn)' : 'var(--danger)';
      return `<div id="trivia-q-${idx}" style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;">
          <span style="font-size:10px;font-weight:700;color:${dc};text-transform:uppercase;letter-spacing:1px;padding:2px 8px;border-radius:4px;background:${dc}15;border:1px solid ${dc}30;white-space:nowrap;">${q.difficulty}</span>
          <span style="font-size:11px;color:var(--muted);">${decodeURIComponent(q.category)}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text);line-height:1.5;">${decodeURIComponent(q.question)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${allAnswers.map((a, ai) => `<button id="trivia-a-${idx}-${ai}" onclick="checkTrivia(${idx},${ai},${correctIdx})" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:12px;cursor:pointer;text-align:left;transition:all .15s;font-family:'Syne',sans-serif;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="if(!this.dataset.checked)this.style.borderColor='var(--border)'">${a}</button>`).join('')}
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    const msg = window.CodeMindSafety ? CodeMindSafety.explainError(e, 'Trivia API') : e.message;
    out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ ${msg}<br/><span style="color:var(--muted);font-size:11px">Input format: amount must be a whole number from 1 to 20.</span></div>`;
  }
}

function checkTrivia(qIdx, ansIdx, correctIdx) {
  const allBtns = document.querySelectorAll(`[id^="trivia-a-${qIdx}-"]`);
  allBtns.forEach((btn, i) => {
    btn.dataset.checked = '1';
    btn.style.cursor = 'not-allowed';
    btn.onclick = null;
    btn.onmouseover = null;
    btn.onmouseout = null;
    if (i === correctIdx) {
      btn.style.background = 'rgba(16,185,129,.15)';
      btn.style.borderColor = 'var(--accent3)';
      btn.style.color = 'var(--accent3)';
      btn.innerHTML += ' ✅';
    } else if (i === ansIdx) {
      btn.style.background = 'rgba(239,68,68,.15)';
      btn.style.borderColor = 'var(--danger)';
      btn.style.color = 'var(--danger)';
      btn.innerHTML += ' ❌';
    } else {
      btn.style.opacity = '0.5';
    }
  });
}

// ============================================================
// NEW API: QR CODE GENERATOR — qr-code-generator.com (free)
// ============================================================
function generateQR() {
  const text = document.getElementById('qrInput')?.value?.trim();
  const size = document.getElementById('qrSize')?.value || '200';
  const out = document.getElementById('qrOutput');
  if (!text || !out) return;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=FFFFFF&color=000000&margin=10`;
  out.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;align-items:center;gap:10px;">
    <img src="${url}" alt="QR Code" style="border-radius:8px;max-width:100%;border:4px solid white;" onload="document.getElementById('qrDownloadBtn').style.display=''"/>
    <div style="font-size:12px;color:var(--muted);max-width:${size}px;word-break:break-all;text-align:center;">${text.substring(0,80)}${text.length>80?'...':''}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a id="qrDownloadBtn" href="${url}" download="qrcode.png" target="_blank" style="display:none;padding:8px 16px;background:linear-gradient(135deg,var(--accent2),var(--accent));border-radius:8px;color:#fff;font-size:12px;font-weight:700;text-decoration:none;">⬇️ Download PNG</a>
      <button onclick="navigator.clipboard.writeText('${url.replace(/'/g,"\\'")}');this.textContent='✓ Copied!';setTimeout(()=>this.textContent='📋 Copy URL',1500)" style="padding:8px 16px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);color:var(--muted);font-size:12px;cursor:pointer;">📋 Copy URL</button>
    </div>
    <div style="font-size:10px;color:var(--muted);">Powered by qrserver.com (free, no key)</div>
  </div>`;
}

// ============================================================
// NEW API: RANDOM USER GENERATOR — randomuser.me (free, no key)
// ============================================================
async function fetchRandomUsers() {
  const count = window.CodeMindSafety ? CodeMindSafety.numberInRange('randomUserCount', 1, 20, 5) : parseInt(document.getElementById('randomUserCount')?.value||5);
  const nationality = document.getElementById('randomUserNat')?.value||'';
  const out = document.getElementById('randomUserOutput');
  if (!out) return;
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">👤 Generating users...</div>';
  try {
    let url = `https://randomuser.me/api/?results=${count}&inc=name,email,phone,location,picture,login,dob,nat`;
    if (nationality) url += `&nat=${nationality}`;
    const data = window.CodeMindSafety ? await CodeMindSafety.fetchJson(url, {}, 'Random User API') : await (await fetch(url)).json();
    if (!data.results?.length) throw new Error('No users returned. Check count/nationality format.');
    out.innerHTML = `<div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-family:'JetBrains Mono',monospace;display:flex;align-items:center;gap:8px;">
      <span>${data.results.length} users generated</span>
      <button onclick="copyToClipboard(JSON.stringify(window._lastRandomUsers,null,2))" style="padding:3px 10px;border-radius:4px;background:var(--bg3);border:1px solid var(--border);color:var(--muted);font-size:10px;cursor:pointer;">📋 Copy JSON</button>
    </div>` +
    `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;">` +
    data.results.map(u => `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:7px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="${u.picture?.medium}" style="width:44px;height:44px;border-radius:50%;border:2px solid var(--accent2);" onerror="this.style.display='none'"/>
        <div>
          <div style="font-size:13px;font-weight:800;color:var(--text);">${u.name?.first} ${u.name?.last}</div>
          <div style="font-size:10px;color:var(--muted);">${u.dob?.age}y · ${u.nat}</div>
        </div>
      </div>
      <div style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--accent);word-break:break-all;">${u.email}</div>
      <div style="font-size:11px;color:var(--muted);">📞 ${u.phone}</div>
      <div style="font-size:11px;color:var(--muted);">📍 ${u.location?.city}, ${u.location?.country}</div>
      <code style="font-size:10px;color:var(--accent2);background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:3px 6px;cursor:pointer;word-break:break-all;" onclick="navigator.clipboard.writeText(this.textContent)" title="Click to copy username">@${u.login?.username}</code>
    </div>`).join('') + '</div>';
    window._lastRandomUsers = data.results;
  } catch(e) {
    const msg = window.CodeMindSafety ? CodeMindSafety.explainError(e, 'Random User API') : e.message;
    out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ ${msg}<br/><span style="color:var(--muted);font-size:11px">Input format: count 1-20, nationality optional from the dropdown.</span></div>`;
  }
}

// ============================================================
// NEW API: OPEN EXCHANGE RATES / exchangerate-api (free)
// ============================================================
async function fetchExchangeRates() {
  const from = window.CodeMindSafety ? CodeMindSafety.currencyCode('currencyFrom', 'USD') : (document.getElementById('currencyFrom')?.value || 'USD');
  const to = window.CodeMindSafety ? CodeMindSafety.currencyCode('currencyTo', 'EUR') : (document.getElementById('currencyTo')?.value || 'EUR');
  const amount = Math.max(0.01, parseFloat(document.getElementById('currencyAmount')?.value || 1));
  const out = document.getElementById('currencyOutput');
  if (!out) return;
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">💱 Fetching rates...</div>';
  try {
    const data = window.CodeMindSafety ? await CodeMindSafety.fetchJson(`https://open.er-api.com/v6/latest/${from}`, {}, 'Exchange Rate API') : await (await fetch(`https://open.er-api.com/v6/latest/${from}`)).json();
    if (data.result !== 'success') throw new Error('API error');
    const rate = data.rates[to];
    if (!rate) throw new Error(`Currency ${to} not found`);
    const converted = (amount * rate).toFixed(2);
    const popularCurrencies = ['USD','EUR','GBP','JPY','AUD','CAD','CHF','CNY','INR','MXN','BRL','KRW','SGD','HKD','NOK','SEK','DKK'];
    const otherRates = popularCurrencies.filter(c => c !== from).map(c => ({ code:c, rate: data.rates[c] }));
    out.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">
      <div style="background:linear-gradient(135deg,rgba(124,58,237,.1),rgba(0,229,255,.1));border:1px solid rgba(0,229,255,.2);border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:900;color:var(--accent);font-family:'JetBrains Mono',monospace;">${amount} ${from} = ${converted} ${to}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:4px;">Rate: 1 ${from} = ${rate.toFixed(6)} ${to}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px;">Updated: ${new Date(data.time_last_update_utc).toLocaleDateString()}</div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:7px;">Popular Rates (1 ${from} = ...)</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:5px;">
          ${otherRates.map(r => `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:7px 10px;cursor:pointer;" onclick="document.getElementById('currencyTo').value='${r.code}';fetchExchangeRates()" title="Convert to ${r.code}">
            <div style="font-size:11px;color:var(--muted);font-weight:700;">${r.code}</div>
            <div style="font-size:13px;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--text);">${r.rate?.toFixed(4)||'N/A'}</div>
          </div>`).join('')}
        </div>
      </div>
      <div style="font-size:10px;color:var(--muted);">Powered by open.er-api.com — free, no key required</div>
    </div>`;
  } catch(e) {
    const msg = window.CodeMindSafety ? CodeMindSafety.explainError(e, 'Exchange Rate API') : e.message;
    out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ ${msg}<br/><span style="color:var(--muted);font-size:11px">Input format: amount like 100, currency codes like USD, INR, EUR only.</span></div>`;
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showNotification('✅ Copied to clipboard!', 'ok'));
}

// Function aliases (HTML uses different names)
const fetchHFModels = fetchHuggingFace;
var fetchPapers = (...args) => window.CodeMindOptionAPIs?.fetchPapers?.(...args) || fetchMLPapers(...args);

// SQL Playground extra helpers
function clearSQL() {
  const el = document.getElementById('sqlEditor') || document.getElementById('sqlInput');
  if (el) el.value = '';
  const out = document.getElementById('sqlOutput');
  if (out) out.innerHTML = 'Run a SQL query to see results here...';
  const aiOut = document.getElementById('sqlAiOutput');
  if (aiOut) { aiOut.style.display = 'none'; aiOut.innerHTML = ''; }
}

function insertSqlSnippet(cmd) {
  const el = document.getElementById('sqlEditor') || document.getElementById('sqlInput');
  if (!el) return;
  const pos = el.selectionStart;
  el.value = el.value.slice(0, pos) + cmd + ' ' + el.value.slice(pos);
  el.focus();
  el.selectionStart = el.selectionEnd = pos + cmd.length + 1;
}

function loadSqlTemplate(name) {
  const templates = {
    create_insert: `CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  salary REAL,
  hire_date TEXT
);

INSERT INTO employees VALUES (1,'Alice','Engineering',95000,'2020-01-15');
INSERT INTO employees VALUES (2,'Bob','Marketing',75000,'2019-06-01');
INSERT INTO employees VALUES (3,'Charlie','Engineering',110000,'2021-03-20');

SELECT * FROM employees WHERE salary > 80000 ORDER BY salary DESC;`,
    select_join: `-- Try with sample data:
-- SELECT u.name, o.product, o.amount
-- FROM users u
-- JOIN orders o ON u.id = o.user_id
-- WHERE o.amount > 100
-- ORDER BY o.amount DESC;

SELECT name, age FROM users WHERE age > 25 ORDER BY age DESC;`,
    aggregate: `SELECT role, COUNT(*) as count, AVG(age) as avg_age
FROM users
GROUP BY role;`,
    subquery: `-- Subquery example:
SELECT name FROM users
WHERE id IN (SELECT user_id FROM orders WHERE amount > 200);`,
    window: `-- Window functions (simplified):
SELECT name, age, role FROM users ORDER BY age DESC LIMIT 3;`,
    cte: `-- CTE example:
SELECT name, age FROM users WHERE age > 25 ORDER BY age DESC LIMIT 5;`,
    ml_schema: `-- ML Dataset exploration:
SELECT * FROM products ORDER BY price DESC LIMIT 5;`
  };
  const el = document.getElementById('sqlEditor') || document.getElementById('sqlInput');
  if (el && templates[name]) { el.value = templates[name]; runSQL(); }
}

async function aiExplainSQL() {
  const q = (document.getElementById('sqlEditor')?.value || '').trim();
  if (!q || !apiKey) { if (!apiKey) openModal('apiModal'); return; }
  const out = document.getElementById('sqlAiOutput');
  if (!out) return;
  out.style.display = '';
  out.innerHTML = '<span style="color:var(--muted)">🤖 Explaining query...</span>';
  try {
    const { text } = await callGemini('You are a SQL expert. Explain SQL queries clearly.',
      `Explain this SQL query step by step:\n\`\`\`sql\n${q}\n\`\`\`\nInclude: 1) What it does, 2) Any potential issues, 3) How to optimize it.`);
    out.innerHTML = renderMarkdown(text);
  } catch(e) { out.innerHTML = `<span style="color:var(--danger)">❌ ${e.message}</span>`; }
}

async function aiOptimizeSQL() {
  const q = (document.getElementById('sqlEditor')?.value || '').trim();
  if (!q || !apiKey) { if (!apiKey) openModal('apiModal'); return; }
  const out = document.getElementById('sqlAiOutput');
  if (!out) return;
  out.style.display = '';
  out.innerHTML = '<span style="color:var(--muted)">⚡ Optimizing query...</span>';
  try {
    const { text } = await callGemini('You are a SQL performance expert.',
      `Optimize this SQL query and explain the improvements:\n\`\`\`sql\n${q}\n\`\`\`\nProvide the optimized version with explanation.`);
    out.innerHTML = renderMarkdown(text);
  } catch(e) { out.innerHTML = `<span style="color:var(--danger)">❌ ${e.message}</span>`; }
}

// Init
updateJ0Status();
init();
initExtras();
