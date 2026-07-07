// ============================================================
// REGEX TESTER
// ============================================================
function toggleFlag(f) {
  const btn = document.getElementById('flag-' + f);
  if (regexFlags.has(f)) { regexFlags.delete(f); btn.classList.remove('active'); }
  else { regexFlags.add(f); btn.classList.add('active'); }
  runRegex();
}

function runRegex() {
  const pattern = document.getElementById('regexPattern').value;
  const testStr = document.getElementById('regexTestStr').value;
  const output = document.getElementById('regexOutput');
  const stats = document.getElementById('regexStats');
  if (!pattern) { output.innerHTML = '<span style="color:var(--muted)">Enter a pattern...</span>'; stats.textContent = ''; return; }
  try {
    const flags = [...regexFlags].join('');
    const re = new RegExp(pattern, flags);
    output.className = 'regex-result-box';
    if (!testStr) { output.innerHTML = '<span style="color:var(--muted)">Enter test string...</span>'; stats.textContent = ''; return; }
    const matches = [...testStr.matchAll(new RegExp(pattern, flags.includes('g') ? flags : flags+'g'))];
    if (matches.length === 0) {
      output.innerHTML = `<span style="color:var(--muted)">${escapeHtml(testStr)}</span>`;
      stats.textContent = '0 matches';
      return;
    }
    let html = '';
    let last = 0;
    for (const m of matches) {
      html += escapeHtml(testStr.slice(last, m.index));
      html += `<span class="regex-match" title="Match: ${escapeHtml(m[0])}">${escapeHtml(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    html += escapeHtml(testStr.slice(last));
    output.innerHTML = html;
    stats.textContent = `${matches.length} match${matches.length !== 1 ? 'es' : ''} · /${pattern}/${[...regexFlags].join('')}`;
  } catch(e) {
    output.innerHTML = `<span class="regex-err">⚠️ ${e.message}</span>`;
    stats.textContent = '';
  }
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function clearRegex() {
  document.getElementById('regexPattern').value = '';
  document.getElementById('regexTestStr').value = '';
  document.getElementById('regexOutput').innerHTML = '<span style="color:var(--muted)">Enter a pattern and test string above...</span>';
  document.getElementById('regexStats').textContent = '';
  document.getElementById('regexExplain').innerHTML = '<span style="color:var(--muted)">Click "Explain Regex" for a breakdown...</span>';
}

async function explainRegex() {
  const pattern = document.getElementById('regexPattern').value;
  if (!pattern) { alert('Enter a regex pattern first!'); return; }
  if (!apiKey) { openModal('apiModal'); return; }
  const box = document.getElementById('regexExplain');
  box.innerHTML = '<span style="color:var(--muted)">🤖 Analyzing...</span>';
  try {
    const { text } = await callGemini(
      'You are a regex expert. Explain regular expressions clearly and concisely.',
      `Explain this regex pattern in detail: /${pattern}/${[...regexFlags].join('')}\n\nBreak down each part, explain what it matches, and give 2-3 example strings it would match.`
    );
    box.innerHTML = renderMarkdown(text);
  } catch(e) {
    box.innerHTML = `<span style="color:var(--danger)">❌ ${e.message}</span>`;
  }
}

async function generateRegex() {
  const desc = prompt('Describe what your regex should match (e.g. "valid email addresses"):');
  if (!desc) return;
  if (!apiKey) { openModal('apiModal'); return; }
  const box = document.getElementById('regexExplain');
  box.innerHTML = '<span style="color:var(--muted)">🤖 Generating...</span>';
  try {
    const { text } = await callGemini(
      'You are a regex expert. Generate precise, practical regular expressions.',
      `Generate a JavaScript regex for: "${desc}"\n\nProvide:\n1. The regex pattern (just the pattern, no flags)\n2. Recommended flags\n3. Brief explanation\n4. 3 test cases that match and 2 that don't`
    );
    box.innerHTML = renderMarkdown(text);
    // Try to extract the pattern automatically
    const m = text.match(/`\/([^`/]+)\/[gimsuy]*`|^\/([^/\n]+)\//m);
    if (m) document.getElementById('regexPattern').value = m[1] || m[2];
    runRegex();
  } catch(e) {
    box.innerHTML = `<span style="color:var(--danger)">❌ ${e.message}</span>`;
  }
}

// ============================================================
// CODE DIFF
// ============================================================
function runDiff() {
  const before = document.getElementById('diffBefore').value;
  const after = document.getElementById('diffAfter').value;
  const output = document.getElementById('diffOutput');
  if (!before.trim() && !after.trim()) { output.innerHTML = '<span style="color:var(--muted)">Paste code in both panels first...</span>'; return; }

  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const html = [];
  const maxLen = Math.max(beforeLines.length, afterLines.length);

  // Simple line-by-line diff
  const removed = new Set();
  const added = new Set();
  const bl = beforeLines, al = afterLines;

  // LCS-based diff
  const lcs = computeLCS(bl, al);
  let bi = 0, ai = 0, li = 0;
  while (bi < bl.length || ai < al.length) {
    if (li < lcs.length && bi < bl.length && ai < al.length && bl[bi] === lcs[li] && al[ai] === lcs[li]) {
      html.push(`<span class="diff-same">  ${escapeHtml(bl[bi])}</span>`);
      bi++; ai++; li++;
    } else if (ai < al.length && (li >= lcs.length || al[ai] !== lcs[li])) {
      html.push(`<span class="diff-add">+ ${escapeHtml(al[ai])}</span>`);
      ai++;
    } else if (bi < bl.length && (li >= lcs.length || bl[bi] !== lcs[li])) {
      html.push(`<span class="diff-rem">- ${escapeHtml(bl[bi])}</span>`);
      bi++;
    } else { bi++; ai++; }
  }

  const addCount = html.filter(l=>l.includes('diff-add')).length;
  const remCount = html.filter(l=>l.includes('diff-rem')).length;
  output.innerHTML = html.join('') || '<span style="color:var(--accent3)">✅ No differences found!</span>';
  document.getElementById('diffAiSummary').innerHTML = `<span style="color:var(--muted)">+${addCount} lines added, -${remCount} lines removed. Click "AI Explain Changes" for semantic analysis.</span>`;
}

function computeLCS(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1}, ()=>Array(n+1).fill(0));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j],dp[i][j-1]);
  let i=m,j=n; const lcs=[];
  while(i>0&&j>0) {
    if(a[i-1]===b[j-1]){lcs.unshift(a[i-1]);i--;j--;}
    else if(dp[i-1][j]>dp[i][j-1])i--; else j--;
  }
  return lcs;
}

async function aiExplainDiff() {
  const before = document.getElementById('diffBefore').value.trim();
  const after = document.getElementById('diffAfter').value.trim();
  if (!before && !after) { alert('Paste code in both panels first!'); return; }
  if (!apiKey) { openModal('apiModal'); return; }
  const box = document.getElementById('diffAiSummary');
  box.innerHTML = '<span style="color:var(--muted)">🤖 Analyzing changes...</span>';
  try {
    const { text } = await callGemini(
      `You are an expert code reviewer. Analyze code changes concisely and clearly.`,
      `Analyze what changed between these two code versions:\n\n**BEFORE:**\n\`\`\`${currentLang}\n${before}\n\`\`\`\n\n**AFTER:**\n\`\`\`${currentLang}\n${after}\n\`\`\`\n\nExplain: 1) What was changed and why it matters, 2) Any bugs introduced or fixed, 3) Performance or readability impact, 4) Overall assessment.`
    );
    box.innerHTML = renderMarkdown(text);
  } catch(e) {
    box.innerHTML = `<span style="color:var(--danger)">❌ ${e.message}</span>`;
  }
}


