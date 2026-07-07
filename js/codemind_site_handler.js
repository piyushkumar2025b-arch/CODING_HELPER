(function CodeMindSiteHandler() {
  'use strict';

  const DB_NAME = 'codemind_local_db';
  const DB_VERSION = 1;
  const CONVERSATIONS = 'conversations';
  const DRAFT_KEY = 'cm_local_draft';
  const isStreamlit = !!window.CODEMIND_STREAMLIT_MODE;
  const isCloudStreamlit = !!window.CODEMIND_STREAMLIT_CLOUD_MODE;
  const isLocalHost = ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname);
  const localDbEnabled = isLocalHost && !isCloudStreamlit && ('indexedDB' in window);
  const localDbUrl = window.CODEMIND_LOCAL_DB_URL || 'http://127.0.0.1:8787';
  let sqliteAvailable = false;
  let dbPromise = null;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function openDb() {
    if (!localDbEnabled) return Promise.resolve(null);
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CONVERSATIONS)) {
          const store = db.createObjectStore(CONVERSATIONS, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('mode', 'mode');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function dbWrite(storeName, mode, callback) {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = callback(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function dbReadAll() {
    const db = await openDb();
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CONVERSATIONS, 'readonly');
      const req = tx.objectStore(CONVERSATIONS).getAll();
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.createdAt - a.createdAt));
      req.onerror = () => reject(req.error);
    });
  }

  async function checkSqlite() {
    if (!isLocalHost || isCloudStreamlit) return false;
    try {
      const res = await fetch(`${localDbUrl}/health`, { cache: 'no-store' });
      const data = await res.json();
      sqliteAvailable = !!data.ok;
      return sqliteAvailable;
    } catch (_) {
      sqliteAvailable = false;
      return false;
    }
  }

  async function sqliteSave(item) {
    if (!sqliteAvailable) return false;
    try {
      const res = await fetch(`${localDbUrl}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      return res.ok;
    } catch (_) {
      sqliteAvailable = false;
      return false;
    }
  }

  async function sqliteList() {
    if (!sqliteAvailable) return null;
    try {
      const res = await fetch(`${localDbUrl}/conversations`, { cache: 'no-store' });
      const data = await res.json();
      return data.ok ? data.items || [] : null;
    } catch (_) {
      sqliteAvailable = false;
      return null;
    }
  }

  async function sqliteClear() {
    if (!sqliteAvailable) return false;
    try {
      const res = await fetch(`${localDbUrl}/conversations`, { method: 'DELETE' });
      return res.ok;
    } catch (_) {
      sqliteAvailable = false;
      return false;
    }
  }

  function val(id) {
    return document.getElementById(id)?.value || '';
  }

  function text(id) {
    return document.getElementById(id)?.innerText || '';
  }

  function appVar(name, fallback) {
    try {
      const value = Function(`return typeof ${name} !== "undefined" ? ${name} : undefined`)();
      return value === undefined ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function snapshotPrompt() {
    return {
      question: val('questionInput').trim(),
      codeInput: val('codeInput').trim(),
      editorCode: val('codeEditor').trim(),
      language: appVar('currentLang', 'javascript'),
      mode: appVar('currentMode', 'solve'),
      platform: appVar('currentPlatform', 'general'),
      answerType: appVar('selectedAnswerType', 'optimal')
    };
  }

  async function saveConversation(before, status, errorMessage) {
    if (!localDbEnabled) return;
    const responseText = text('responsePanel').trim();
    const hasContent = before.question || before.codeInput || before.editorCode || responseText || errorMessage;
    if (!hasContent) return;

    const item = {
      id: `cm_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      status,
      errorMessage: errorMessage || '',
      responseText,
      responseHtml: document.getElementById('responsePanel')?.innerHTML || '',
      ...before
    };

    const savedToSqlite = await sqliteSave(item);
    if (!savedToSqlite) {
      await dbWrite(CONVERSATIONS, 'readwrite', store => store.put(item)).catch(() => null);
    }
    renderDbBadge();
  }

  function debounce(fn, wait) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  function saveDraft() {
    const draft = snapshotPrompt();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || Date.now() - draft.savedAt > 1000 * 60 * 60 * 24 * 7) return;
      if (document.getElementById('questionInput') && !val('questionInput')) document.getElementById('questionInput').value = draft.question || '';
      if (document.getElementById('codeInput') && !val('codeInput')) document.getElementById('codeInput').value = draft.codeInput || '';
      if (document.getElementById('codeEditor') && !val('codeEditor')) document.getElementById('codeEditor').value = draft.editorCode || '';
    } catch (_) {}
  }

  function installAskWrapper() {
    if (typeof window.askAI !== 'function' || window.askAI.__cmWrapped) return;
    const original = window.askAI;
    window.askAI = async function wrappedAskAI(...args) {
      const before = snapshotPrompt();
      try {
        const result = await original.apply(this, args);
        await saveConversation(before, 'success', '');
        return result;
      } catch (error) {
        await saveConversation(before, 'error', error?.message || String(error));
        throw error;
      }
    };
    window.askAI.__cmWrapped = true;
  }

  function installSmoothness() {
    document.documentElement.style.scrollBehavior = 'smooth';
    document.addEventListener('input', debounce(saveDraft, 450), true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveDraft();
    });

    const lazyWork = () => {
      document.querySelectorAll('textarea, input').forEach(el => {
        el.setAttribute('spellcheck', el.id === 'questionInput' ? 'true' : 'false');
      });
    };

    if ('requestIdleCallback' in window) requestIdleCallback(lazyWork, { timeout: 1500 });
    else setTimeout(lazyWork, 250);
  }

  function showStreamlitNotice() {
    if (!isCloudStreamlit || localStorage.getItem('cm_streamlit_notice_closed') === '1') return;
    const notice = document.createElement('div');
    notice.id = 'cm-streamlit-notice';
    notice.className = 'cm-glass';
    notice.style.cssText = [
      'position:fixed',
      'left:18px',
      'right:18px',
      'bottom:18px',
      'z-index:100000',
      'border:1px solid rgba(0,229,255,.35)',
      'border-radius:10px',
      'background:rgba(17,17,24,.96)',
      'box-shadow:0 18px 60px rgba(0,0,0,.5)',
      'padding:14px',
      'display:flex',
      'gap:12px',
      'align-items:flex-start',
      'justify-content:space-between',
      'color:var(--text)',
      "font-family:'Syne',sans-serif"
    ].join(';');

    notice.innerHTML = `<div style="max-width:900px">
      <div style="font-size:14px;font-weight:900;color:var(--accent);margin-bottom:4px">Streamlit Cloud mode</div>
      <div style="font-size:12px;line-height:1.55;color:var(--muted)">
        You are viewing CodeMind on Streamlit Cloud, so the local conversation database is disabled here and this deployment will not save your chats permanently.
        To save every conversation on your laptop, run the project locally. Read the setup guide here:
        <a href="README.md" target="_blank" style="color:var(--accent);font-weight:800">README.md</a>.
        Process: download/clone the project, run <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">pip install -r requirements.txt</code>,
        then run <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">streamlit run streamlit_app.py</code>.
      </div>
    </div>
    <button type="button" id="cm-streamlit-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:7px;padding:7px 10px;cursor:pointer;flex:none">Close</button>`;

    document.body.appendChild(notice);
    document.getElementById('cm-streamlit-close')?.addEventListener('click', () => {
      localStorage.setItem('cm_streamlit_notice_closed', '1');
      notice.remove();
    });
  }

  function showDatabaseUnavailableNotice() {
    const old = document.getElementById('cm-db-unavailable-notice');
    if (old) old.remove();

    const notice = document.createElement('div');
    notice.id = 'cm-db-unavailable-notice';
    notice.className = 'cm-glass';
    notice.style.cssText = [
      'position:fixed',
      'left:18px',
      'right:18px',
      'bottom:18px',
      'z-index:100000',
      'border:1px solid rgba(245,158,11,.42)',
      'border-radius:10px',
      'background:rgba(17,17,24,.96)',
      'box-shadow:0 18px 60px rgba(0,0,0,.5)',
      'padding:14px',
      'display:flex',
      'gap:12px',
      'align-items:flex-start',
      'justify-content:space-between',
      'color:var(--text)',
      "font-family:'Syne',sans-serif"
    ].join(';');

    notice.innerHTML = `<div style="max-width:900px">
      <div style="font-size:14px;font-weight:900;color:var(--warn);margin-bottom:4px">Local database unavailable</div>
      <div style="font-size:12px;line-height:1.55;color:var(--muted)">
        Conversation saving is available only when CodeMind is running locally on your own laptop, such as
        <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">localhost</code> or
        <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">127.0.0.1</code>.
        On Streamlit Cloud, chats are not saved permanently for privacy and deployment safety.
        See <a href="README.md" target="_blank" style="color:var(--accent);font-weight:800">README.md</a> for the local setup process.
      </div>
    </div>
    <button type="button" id="cm-db-unavailable-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:7px;padding:7px 10px;cursor:pointer;flex:none">Close</button>`;

    document.body.appendChild(notice);
    document.getElementById('cm-db-unavailable-close')?.addEventListener('click', () => notice.remove());
    setTimeout(() => notice.remove(), 12000);
  }

  async function renderDbBadge() {
    if (!localDbEnabled) return;
    const rows = (await sqliteList()) || (await dbReadAll().catch(() => []));
    const count = rows.length;
    let badge = document.getElementById('cm-local-db-badge');
    if (!badge) {
      badge = document.createElement('button');
      badge.id = 'cm-local-db-badge';
      badge.type = 'button';
      badge.className = 'cm-neon-hover';
      badge.style.cssText = [
        'position:fixed',
        'right:18px',
        'bottom:188px',
        'z-index:99998',
        'border:1px solid rgba(16,185,129,.45)',
        'background:rgba(17,17,24,.92)',
        'color:#e8e8f0',
        'border-radius:8px',
        'padding:8px 12px',
        "font-family:'JetBrains Mono',monospace",
        'font-size:11px',
        'font-weight:800',
        'cursor:pointer',
        'box-shadow:0 10px 30px rgba(0,0,0,.35)'
      ].join(';');
      badge.onclick = showDbPanel;
      document.body.appendChild(badge);
    }
    badge.textContent = `${sqliteAvailable ? 'SQLite DB' : 'Local DB'} ${count}`;
    badge.title = isLocalHost
      ? sqliteAvailable
        ? 'SQLite database is saving conversations on this laptop'
        : 'Browser database is saving conversations on this local browser'
      : isStreamlit
        ? 'Local Streamlit run: conversations are saved in this browser database'
        : 'IndexedDB is active for this browser profile';
  }

  async function showDbPanel() {
    if (!localDbEnabled) {
      showDatabaseUnavailableNotice();
      return;
    }
    const old = document.getElementById('cm-local-db-panel');
    if (old) { old.remove(); return; }
    const rows = (await sqliteList()) || (await dbReadAll().catch(() => []));
    const panel = document.createElement('div');
    panel.id = 'cm-local-db-panel';
    panel.className = 'cm-glass';
    panel.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:236px',
      'width:min(460px,calc(100vw - 36px))',
      'max-height:58vh',
      'overflow:auto',
      'z-index:99999',
      'border:1px solid rgba(16,185,129,.35)',
      'border-radius:10px',
      'background:rgba(17,17,24,.96)',
      'box-shadow:0 18px 60px rgba(0,0,0,.5)',
      "font-family:'JetBrains Mono',monospace",
      'color:#e8e8f0'
    ].join(';');

    panel.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px">
      <div>
        <div style="font-size:12px;font-weight:900;color:var(--accent3)">Local Conversation Database</div>
        <div style="font-size:10px;color:var(--muted);line-height:1.5">${sqliteAvailable ? 'Saving to local SQLite on this laptop.' : 'Saving to this local browser database.'}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button type="button" id="cm-db-export" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Export</button>
        <button type="button" id="cm-db-clear" style="border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.12);color:#fca5a5;border-radius:6px;padding:6px 8px;cursor:pointer">Clear</button>
        <button type="button" onclick="document.getElementById('cm-local-db-panel')?.remove()" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Close</button>
      </div>
    </div>
    <div id="cm-db-rows">${rows.length ? rows.map(renderConversationRow).join('') : '<div style="padding:18px;color:var(--muted);font-size:11px;text-align:center;border-top:1px solid rgba(255,255,255,.06)">No conversations saved yet. Ask CodeMind once and it will appear here.</div>'}</div>`;

    document.body.appendChild(panel);
    document.getElementById('cm-db-export')?.addEventListener('click', () => exportDb(rows));
    document.getElementById('cm-db-clear')?.addEventListener('click', clearDb);
    document.getElementById('cm-db-rows')?.addEventListener('click', event => {
      const row = event.target.closest('[data-cm-conv]');
      if (!row) return;
      const item = rows.find(entry => entry.id === row.dataset.cmConv);
      if (item) restoreConversation(item);
    });
  }

  function renderConversationRow(item) {
    const title = (item.question || item.codeInput || item.editorCode || 'Untitled conversation').slice(0, 90);
    const date = new Date(item.createdAt).toLocaleString();
    const color = item.status === 'success' ? 'var(--accent3)' : 'var(--danger)';
    return `<button type="button" data-cm-conv="${item.id}" style="display:block;width:100%;text-align:left;background:transparent;border:0;border-top:1px solid rgba(255,255,255,.06);padding:10px 12px;cursor:pointer;color:var(--text)">
      <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:4px">
        <span style="font-size:11px;font-weight:900;color:${color};text-transform:uppercase">${item.status}</span>
        <span style="font-size:10px;color:var(--muted)">${date}</span>
      </div>
      <div style="font-size:12px;font-weight:800;line-height:1.35">${escapeHtml(title)}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:3px">${escapeHtml(item.mode)} · ${escapeHtml(item.language)} · ${escapeHtml(item.platform)}</div>
    </button>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function exportDb(rows) {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codemind-conversations-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function clearDb() {
    if (!confirm('Clear all locally saved CodeMind conversations from this browser?')) return;
    const clearedSqlite = await sqliteClear();
    if (!clearedSqlite) {
      await dbWrite(CONVERSATIONS, 'readwrite', store => store.clear()).catch(() => null);
    }
    document.getElementById('cm-local-db-panel')?.remove();
    renderDbBadge();
  }

  function restoreConversation(item) {
    const question = document.getElementById('questionInput');
    const codeInput = document.getElementById('codeInput');
    const editor = document.getElementById('codeEditor');
    const panel = document.getElementById('responsePanel');
    if (question) question.value = item.question || '';
    if (codeInput) codeInput.value = item.codeInput || '';
    if (editor) editor.value = item.editorCode || item.codeInput || '';
    if (panel) panel.innerHTML = item.responseHtml || `<div class="ai-msg"><div class="ai-content"><pre>${escapeHtml(item.responseText || '')}</pre></div></div>`;
    if (typeof switchTab === 'function') switchTab('response');
    document.getElementById('cm-local-db-panel')?.remove();
  }

  function init() {
    installSmoothness();
    restoreDraft();
    installAskWrapper();
    setTimeout(installAskWrapper, 700);
    showStreamlitNotice();
    checkSqlite().finally(renderDbBadge);
  }

  window.CodeMindSite = {
    localDbEnabled,
    sqliteAvailable: () => sqliteAvailable,
    isLocalHost,
    saveConversation,
    listConversations: dbReadAll,
    restoreConversation,
    showDbPanel,
    showDatabaseUnavailableNotice
  };

  ready(init);
})();
