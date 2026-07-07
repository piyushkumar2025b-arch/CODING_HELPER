// ============================================================
// SQL PLAYGROUND — in-browser SQL via sql.js (AlaSQL fallback)
// ============================================================
let sqlPlayData = {};
function initDBPlayground() {
  const sampleTables = {
    users: [
      {id:1, name:'Alice', email:'alice@ex.com', age:28, role:'admin'},
      {id:2, name:'Bob', email:'bob@ex.com', age:34, role:'user'},
      {id:3, name:'Charlie', email:'charlie@ex.com', age:22, role:'user'},
      {id:4, name:'Diana', email:'diana@ex.com', age:31, role:'moderator'},
      {id:5, name:'Eve', email:'eve@ex.com', age:26, role:'user'},
    ],
    orders: [
      {id:1, user_id:1, product:'Laptop', amount:999.99, date:'2024-01-15'},
      {id:2, user_id:2, product:'Keyboard', amount:79.99, date:'2024-01-18'},
      {id:3, user_id:1, product:'Monitor', amount:449.99, date:'2024-02-01'},
      {id:4, user_id:3, product:'Mouse', amount:39.99, date:'2024-02-10'},
      {id:5, user_id:2, product:'Headphones', amount:199.99, date:'2024-02-15'},
      {id:6, user_id:4, product:'Laptop', amount:999.99, date:'2024-03-01'},
    ],
    products: [
      {id:1, name:'Laptop', category:'Electronics', price:999.99, stock:45},
      {id:2, name:'Keyboard', category:'Peripherals', price:79.99, stock:120},
      {id:3, name:'Monitor', category:'Electronics', price:449.99, stock:30},
      {id:4, name:'Mouse', category:'Peripherals', price:39.99, stock:200},
      {id:5, name:'Headphones', category:'Audio', price:199.99, stock:65},
    ]
  };
  sqlPlayData = sampleTables;
  renderDbSchema();
}

function renderDbSchema() {
  const out = document.getElementById('dbSchemaOut');
  if (!out) return;
  out.innerHTML = Object.entries(sqlPlayData).map(([table, rows]) => {
    const cols = rows.length ? Object.keys(rows[0]) : [];
    return `<div style="margin-bottom:8px;">
      <span style="font-weight:800;color:var(--accent);font-family:'JetBrains Mono',monospace;font-size:11px;">📋 ${table}</span>
      <span style="color:var(--muted);font-size:10px;margin-left:6px;">(${cols.join(', ')})</span>
      <span style="color:var(--accent3);font-size:10px;margin-left:6px;">${rows.length} rows</span>
    </div>`;
  }).join('');
}

function runSQL() {
  const q = (document.getElementById('sqlEditor')?.value || document.getElementById('sqlInput')?.value || '').trim();
  const out = document.getElementById('sqlOutput');
  if (!q) { out.innerHTML = '<span style="color:var(--muted)">Write a SQL query above and click Run...</span>'; return; }
  out.innerHTML = '<span style="color:var(--muted)">⏳ Running query...</span>';
  try {
    const result = evalSQL(q);
    if (!result || !result.length) { out.innerHTML = '<span style="color:var(--accent3)">✅ Query executed — no rows returned.</span>'; return; }
    const cols = Object.keys(result[0]);
    out.innerHTML = `<div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:11px;">
        <tr>${cols.map(c=>`<th style="text-align:left;padding:5px 10px;border-bottom:1px solid var(--border);color:var(--accent);font-weight:700;background:var(--bg3);">${c}</th>`).join('')}</tr>
        ${result.map((row,i)=>`<tr style="background:${i%2?'transparent':'rgba(0,229,255,.02)'}">${cols.map(c=>`<td style="padding:4px 10px;border-bottom:1px solid rgba(255,255,255,.04);color:var(--text);">${row[c]??'NULL'}</td>`).join('')}</tr>`).join('')}
      </table>
      <div style="font-size:10px;color:var(--muted);margin-top:6px;font-family:'JetBrains Mono',monospace;">${result.length} row${result.length!==1?'s':''} returned</div>
    </div>`;
  } catch(e) {
    out.innerHTML = `<span style="color:var(--danger)">❌ SQL Error: ${e.message}</span>`;
  }
}

function evalSQL(q) {
  // Lightweight in-browser SQL evaluator
  const upper = q.toUpperCase().trim();
  // SELECT ... FROM table WHERE ... ORDER BY ... LIMIT ...
  const selectMatch = upper.match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
  if (!selectMatch) {
    // JOIN support
    const joinMatch = q.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)\s+(?:INNER\s+)?JOIN\s+(\w+)\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/i);
    if (joinMatch) {
      const [, cols, t1, t2, jt1, jc1, jt2, jc2] = joinMatch;
      const rows1 = sqlPlayData[t1.toLowerCase()] || [];
      const rows2 = sqlPlayData[t2.toLowerCase()] || [];
      let joined = [];
      rows1.forEach(r1 => {
        rows2.forEach(r2 => {
          if (r1[jc1.toLowerCase()] == r2[jc2.toLowerCase()]) {
            const merged = {};
            Object.entries(r1).forEach(([k,v]) => merged[`${t1}.${k}`] = v);
            Object.entries(r2).forEach(([k,v]) => merged[`${t2}.${k}`] = v);
            Object.assign(merged, r1, r2);
            joined.push(merged);
          }
        });
      });
      return applySelectCols(joined, cols.trim());
    }
    throw new Error('Only SELECT and basic JOIN queries supported');
  }
  const [, rawCols, table, whereClause, orderBy, limit] = selectMatch;
  let rows = [...(sqlPlayData[table.toLowerCase()] || [])];
  if (!rows.length && !sqlPlayData[table.toLowerCase()]) throw new Error(`Table "${table}" not found. Available: ${Object.keys(sqlPlayData).join(', ')}`);
  // WHERE
  if (whereClause) {
    rows = rows.filter(row => evalWhere(whereClause.trim(), row));
  }
  // ORDER BY
  if (orderBy) {
    const [col, dir] = orderBy.trim().split(/\s+/);
    rows.sort((a,b) => {
      const av = a[col.toLowerCase()], bv = b[col.toLowerCase()];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return (dir||'ASC').toUpperCase() === 'DESC' ? -cmp : cmp;
    });
  }
  // LIMIT
  if (limit) rows = rows.slice(0, parseInt(limit));
  return applySelectCols(rows, rawCols.trim());
}

function applySelectCols(rows, rawCols) {
  if (rawCols.trim() === '*') return rows;
  const cols = rawCols.split(',').map(c => c.trim().toLowerCase());
  // COUNT(*) / aggregates
  if (cols.some(c => c.startsWith('count'))) {
    return [{ 'count(*)': rows.length }];
  }
  if (cols.some(c => c.startsWith('sum('))) {
    const col = cols[0].match(/sum\((.+)\)/i)?.[1]?.toLowerCase();
    const total = rows.reduce((s,r) => s + (parseFloat(r[col])||0), 0);
    return [{ [`sum(${col})`]: parseFloat(total.toFixed(2)) }];
  }
  if (cols.some(c => c.startsWith('avg('))) {
    const col = cols[0].match(/avg\((.+)\)/i)?.[1]?.toLowerCase();
    const avg = rows.reduce((s,r) => s + (parseFloat(r[col])||0), 0) / (rows.length||1);
    return [{ [`avg(${col})`]: parseFloat(avg.toFixed(2)) }];
  }
  return rows.map(row => {
    const out = {};
    cols.forEach(c => { out[c] = row[c] !== undefined ? row[c] : row[c.split('.').pop()]; });
    return out;
  });
}

function evalWhere(expr, row) {
  // Handle AND / OR
  if (expr.toUpperCase().includes(' AND ')) {
    return expr.split(/ AND /i).every(sub => evalWhere(sub.trim(), row));
  }
  if (expr.toUpperCase().includes(' OR ')) {
    return expr.split(/ OR /i).some(sub => evalWhere(sub.trim(), row));
  }
  // col LIKE '%val%'
  const likeM = expr.match(/(\w+)\s+LIKE\s+'([^']+)'/i);
  if (likeM) {
    const val = String(row[likeM[1].toLowerCase()]||'').toLowerCase();
    const pat = likeM[2].replace(/%/g,'').toLowerCase();
    return val.includes(pat);
  }
  // col IS NULL / NOT NULL
  if (expr.match(/IS\s+NULL/i)) {
    const col = expr.match(/(\w+)\s+IS/i)?.[1]?.toLowerCase();
    return row[col] == null;
  }
  // Operators
  const opM = expr.match(/(\w+)\s*(>=|<=|!=|<>|>|<|=)\s*'?([^']+)'?/);
  if (!opM) return true;
  const [, col, op, rawVal] = opM;
  const rowVal = row[col.toLowerCase()];
  const val = isNaN(rawVal) ? rawVal : parseFloat(rawVal);
  const rv = isNaN(rowVal) ? rowVal : parseFloat(rowVal);
  switch(op) {
    case '=': return rv == val || String(rowVal) === String(rawVal).replace(/'/g,'');
    case '!=': case '<>': return rv != val;
    case '>': return rv > val;
    case '<': return rv < val;
    case '>=': return rv >= val;
    case '<=': return rv <= val;
    default: return true;
  }
}

function setSqlQuery(q) {
  const el = document.getElementById('sqlEditor') || document.getElementById('sqlInput');
  if (el) { el.value = q; runSQL(); }
}

// ============================================================
// LEETCODE STATS — alfa-leetcode-api (free open source)
// ============================================================
async function fetchLeetStats() {
  const user = document.getElementById('leetInput').value.trim();
  if (!user) { alert('Enter a LeetCode username!'); return; }
  const out = document.getElementById('leetOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">🏆 Fetching LeetCode stats...</div>';
  try {
    // Using alfa-leetcode-api (public deployment)
    const res = await fetch(`https://alfa-leetcode-api.onrender.com/userDetails/${encodeURIComponent(user)}`);
    if (!res.ok) throw new Error('User not found or API unavailable');
    const d = await res.json();
    if (d.errors || !d.username) throw new Error(d.errors?.[0]?.message || 'User not found');

    const solved = d.totalSolved || 0;
    const easy = d.easySolved || 0;
    const medium = d.mediumSolved || 0;
    const hard = d.hardSolved || 0;
    const total = d.totalQuestions || 3000;
    const pct = total ? Math.round(solved/total*100) : 0;

    out.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        ${d.avatar?`<img src="${d.avatar}" style="width:56px;height:56px;border-radius:50%;border:2px solid var(--warn);" onerror="this.style.display='none'"/>`:
        `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--warn),var(--accent));display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;">${user[0].toUpperCase()}</div>`}
        <div>
          <div style="font-size:18px;font-weight:900;color:var(--warn);">${d.username}</div>
          ${d.name?`<div style="font-size:12px;color:var(--muted);">${d.name}</div>`:''}
          ${d.ranking?`<div style="font-size:12px;color:var(--accent);font-family:'JetBrains Mono',monospace;">Rank #${d.ranking.toLocaleString()}</div>`:''}
        </div>
        <a href="https://leetcode.com/${user}" target="_blank" style="margin-left:auto;padding:6px 14px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:8px;color:var(--warn);font-size:12px;font-weight:700;text-decoration:none;">View Profile →</a>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:5px;">
          <span>Progress</span><span style="color:var(--text);font-weight:700;">${solved} / ${total} (${pct}%)</span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--accent2),var(--warn));border-radius:4px;"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        <div style="background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3);border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:22px;font-weight:900;color:var(--accent3);">${easy}</div>
          <div style="font-size:10px;font-weight:700;color:var(--accent3);text-transform:uppercase;letter-spacing:1px;">Easy</div>
        </div>
        <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:22px;font-weight:900;color:var(--warn);">${medium}</div>
          <div style="font-size:10px;font-weight:700;color:var(--warn);text-transform:uppercase;letter-spacing:1px;">Medium</div>
        </div>
        <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:22px;font-weight:900;color:var(--danger);">${hard}</div>
          <div style="font-size:10px;font-weight:700;color:var(--danger);text-transform:uppercase;letter-spacing:1px;">Hard</div>
        </div>
      </div>
      ${d.contributionPoint?`<div style="font-size:12px;color:var(--muted);font-family:'JetBrains Mono',monospace;">Contribution Points: <span style="color:var(--accent)">${d.contributionPoint}</span></div>`:''}
    </div>`;
  } catch(e) {
    // Fallback display with useful info
    out.innerHTML = `<div style="background:var(--card);border:1px solid rgba(245,158,11,.2);border-radius:12px;padding:20px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">🏆</div>
      <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px;">Could not load stats for "${user}"</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:14px;">${e.message}</div>
      <a href="https://leetcode.com/${user}" target="_blank" style="padding:8px 18px;background:linear-gradient(135deg,var(--accent2),var(--warn));border-radius:8px;color:#fff;font-size:12px;font-weight:700;text-decoration:none;">View Profile on LeetCode →</a>
    </div>`;
  }
}

// ============================================================
// EXERCISM CHALLENGES — Exercism API (free, no key)
// ============================================================
async function fetchExercism() {
  const track = document.getElementById('exercismTrack').value;
  const diff = document.getElementById('exercismDiff').value;
  const out = document.getElementById('exercismOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">🏋️ Loading exercises...</div>';
  try {
    let url = `https://exercism.org/api/v2/tracks/${track}/exercises`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Track "${track}" not accessible`);
    const data = await res.json();
    let exercises = data.exercises || [];
    if (diff) exercises = exercises.filter(e => (e.difficulty||'').toLowerCase() === diff);
    exercises = exercises.slice(0, 20);
    if (!exercises.length) { out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:30px">No exercises found for this filter.</div>'; return; }
    const diffColors = { easy:'var(--accent3)', medium:'var(--warn)', hard:'var(--danger)' };
    out.innerHTML = `<div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-family:'JetBrains Mono',monospace;">Showing ${exercises.length} exercises from ${track} track · <a href="https://exercism.org/tracks/${track}" target="_blank" style="color:var(--accent);">View on Exercism →</a></div>` +
      `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;">` +
      exercises.map(e => {
        const dc = diffColors[e.difficulty?.toLowerCase()] || 'var(--accent)';
        return `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;transition:border-color .15s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;">
            ${e.icon_url?`<img src="${e.icon_url}" width="22" height="22" style="border-radius:3px;" onerror="this.style.display='none'"/>`:'<span style="font-size:18px;">🏋️</span>'}
            <span style="font-size:13px;font-weight:800;color:var(--text);">${e.slug?.replace(/-/g,' ')?.replace(/\b\w/g,c=>c.toUpperCase())}</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            ${e.difficulty?`<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:${dc};background:${dc}18;border:1px solid ${dc}30;">${e.difficulty}</span>`:''}
            ${e.type?`<span style="padding:2px 8px;border-radius:4px;font-size:10px;color:var(--muted);background:var(--bg3);border:1px solid var(--border);">${e.type}</span>`:''}
          </div>
          <div style="margin-top:7px;">
            <a href="https://exercism.org/tracks/${track}/exercises/${e.slug}" target="_blank" style="font-size:11px;color:var(--accent);font-weight:700;text-decoration:none;">Open Exercise →</a>
          </div>
        </div>`;
      }).join('') + '</div>';
  } catch(e) {
    // Show curated list as fallback
    const fallback = {
      python: [
        {slug:'hello-world',difficulty:'easy'},{slug:'two-fer',difficulty:'easy'},{slug:'gigasecond',difficulty:'easy'},
        {slug:'bob',difficulty:'medium'},{slug:'secret-handshake',difficulty:'medium'},{slug:'word-count',difficulty:'medium'},
        {slug:'bank-account',difficulty:'medium'},{slug:'minesweeper',difficulty:'hard'},{slug:'alphametics',difficulty:'hard'},
      ],
      javascript: [
        {slug:'hello-world',difficulty:'easy'},{slug:'two-fer',difficulty:'easy'},{slug:'resistor-color',difficulty:'easy'},
        {slug:'allergies',difficulty:'medium'},{slug:'clock',difficulty:'medium'},{slug:'robot-simulator',difficulty:'medium'},
        {slug:'zipper',difficulty:'hard'},{slug:'poker',difficulty:'hard'},
      ]
    };
    const list = fallback[track] || fallback.python;
    const dc = { easy:'var(--accent3)', medium:'var(--warn)', hard:'var(--danger)' };
    out.innerHTML = `<div style="font-size:11px;color:var(--warn);margin-bottom:8px;">⚠️ Live API unavailable — showing curated exercises. <a href="https://exercism.org/tracks/${track}" target="_blank" style="color:var(--accent)">Visit Exercism →</a></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;">` +
      list.map(e => `<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;">
        <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:5px;">🏋️ ${e.slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</div>
        <span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:${dc[e.difficulty]};background:${dc[e.difficulty]}18;border:1px solid ${dc[e.difficulty]}30;">${e.difficulty}</span>
        <a href="https://exercism.org/tracks/${track}/exercises/${e.slug}" target="_blank" style="display:block;font-size:11px;color:var(--accent);font-weight:700;text-decoration:none;margin-top:7px;">Open on Exercism →</a>
      </div>`).join('') + '</div>';
  }
}

