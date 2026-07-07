// ============================================================
// INIT
// ============================================================
function init() {
  buildLangGrid();
  updateStatus();
  updateLangUI();
  updateGhStatus();
  regexFlags.add('g');
  document.getElementById('flag-g').classList.add('active');
  if (!apiKey) openModal('apiModal');
  initResizer();
}

function buildLangGrid() {
  const grid = document.getElementById('langGrid');
  grid.innerHTML = '';
  LANGS.forEach(l => {
    const key = langKey(l);
    const chip = document.createElement('div');
    chip.className = 'lang-chip' + (key === currentLang ? ' active' : '');
    chip.textContent = l;
    chip.onclick = () => { setLang(key); };
    chip.id = 'chip-' + key;
    grid.appendChild(chip);
  });
}

function langKey(l) {
  return l.toLowerCase()
    .replace('html/css','html').replace('c++','cpp').replace('c#','csharp')
    .replace(/\s/g,'');
}

function updateLangUI() {
  const lbl = LANG_LABELS[currentLang] || currentLang;
  document.getElementById('editorLangLabel').textContent = lbl;
  document.getElementById('globalLang').value = currentLang;
  document.getElementById('sbLang').textContent = lbl;
  // Show preview button only for HTML
  document.getElementById('previewToggleBtn').style.display = currentLang === 'html' ? '' : 'none';
  // Show/hide stdin bar (not for html/js)
  document.getElementById('stdinBar').style.display = ['html','javascript'].includes(currentLang) ? 'none' : '';
  // Update lang chips
  document.querySelectorAll('.lang-chip').forEach(c => c.classList.remove('active'));
  const chip = document.getElementById('chip-' + currentLang);
  if (chip) chip.classList.add('active');
}

// ============================================================
// MODALS
// ============================================================
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function saveApiKey() {
  const v = document.getElementById('apiKeyInput').value.trim();
  if (v) { apiKey = v; localStorage.setItem('cm_gemini_key', v); }
  updateStatus(); closeModal('apiModal');
}
function saveJ0Key() {
  const v = document.getElementById('j0KeyInput').value.trim();
  if (v) { judge0Key = v; localStorage.setItem('cm_j0_key', v); }
  updateJ0Status(); closeModal('judge0Modal');
}
function updateStatus() {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  if (apiKey) { dot.classList.add('connected'); txt.textContent = 'Gemini ✓'; }
  else { dot.classList.remove('connected'); txt.textContent = 'No API Key'; }
}
function updateJ0Status() {
  const dot = document.getElementById('j0Dot');
  const txt = document.getElementById('j0Text');
  if (judge0Key) { dot.classList.add('connected'); txt.textContent = 'Judge0 ✓'; }
  else { dot.classList.remove('connected'); txt.textContent = 'Judge0'; }
}

// ============================================================
// TABS & MODES
// ============================================================
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('panel-' + name).classList.add('active');
}

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('mode-' + mode).classList.add('active');
  document.getElementById('sbMode').textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
}

function setLang(lang) {
  currentLang = lang;
  updateLangUI();
  if (previewOpen && lang !== 'html') closePreview();
}

function setPlatform(p) {
  currentPlatform = p;
  ['leetcode','codeforces','general'].forEach(x => {
    document.getElementById('plat-' + x).className = 'plat-tag';
  });
  const map = {leetcode:'active-lc', codeforces:'active-cf', general:'active-gen'};
  document.getElementById('plat-' + p).classList.add(map[p]);
  document.getElementById('sbPlatform').textContent = p.charAt(0).toUpperCase() + p.slice(1);
}

function toggleOpt(el, type) {
  document.querySelectorAll('#answerTypeRow .opt-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  selectedAnswerType = type;
}

// ============================================================
// EDITOR HELPERS
// ============================================================
function clearEditor() {
  document.getElementById('codeEditor').value = '';
  document.getElementById('outputBox').textContent = 'Run your code to see output here...';
  document.getElementById('outputBox').className = 'output-box muted-out';
  document.getElementById('execMeta').innerHTML = '';
  document.getElementById('sbExecInfo').textContent = '';
}

function clearAll() {
  document.getElementById('questionInput').value = '';
  document.getElementById('codeInput').value = '';
  clearEditor();
}

function copyEditor() {
  const code = document.getElementById('codeEditor').value;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copyEditorBtn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = '📋 Copy', 1500);
  });
}

function syncToQuestion() {
  document.getElementById('codeInput').value = document.getElementById('codeEditor').value;
}

function quickPrompt(topic) {
  document.getElementById('questionInput').value = topic;
  switchTab('question');
  askAI();
}

// ============================================================
// PREVIEW (HTML/CSS/JS)
// ============================================================
function togglePreview() {
  if (previewOpen) closePreview(); else openPreview();
}

function openPreview() {
  previewOpen = true;
  const col = document.getElementById('previewCol');
  col.classList.remove('hidden');
  col.classList.add('visible');
  document.getElementById('previewToggleBtn').textContent = '🔄 Refresh';
  renderPreview();
}

function closePreview() {
  previewOpen = false;
  const col = document.getElementById('previewCol');
  col.classList.add('hidden');
  col.classList.remove('visible');
  document.getElementById('previewToggleBtn').textContent = '👁 Preview';
}

function renderPreview() {
  const code = document.getElementById('codeEditor').value;
  const frame = document.getElementById('previewFrame');
  const blob = new Blob([code], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  frame.src = url;
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ============================================================
// RESIZER
// ============================================================
function initResizer() {
  const resizer = document.getElementById('resizer');
  const editorCol = document.querySelector('.editor-col');
  const previewCol = document.getElementById('previewCol');
  let isResizing = false, startX = 0, startEditorW = 0;

  resizer.addEventListener('mousedown', e => {
    if (!previewOpen) return;
    isResizing = true;
    startX = e.clientX;
    startEditorW = editorCol.getBoundingClientRect().width;
    resizer.classList.add('dragging');
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', e => {
    if (!isResizing) return;
    const dx = e.clientX - startX;
    const parent = editorCol.parentElement.getBoundingClientRect().width;
    const newW = Math.max(200, Math.min(parent - 200, startEditorW + dx));
    editorCol.style.flex = 'none';
    editorCol.style.width = newW + 'px';
    previewCol.style.width = (parent - newW - 4) + 'px';
    previewCol.style.flex = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) { isResizing = false; resizer.classList.remove('dragging'); document.body.style.userSelect = ''; }
  });
}

