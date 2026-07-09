(function () {
  'use strict';

  function getSessions() {
    try {
      const raw = localStorage.getItem('cm_local_draft');
      return raw ? [JSON.parse(raw)] : [];
    } catch (_) {
      return [];
    }
  }

  function mountSessions() {
    if (document.getElementById('cm-session-panel')) return;
    const panel = document.createElement('aside');
    panel.id = 'cm-session-panel';
    panel.className = 'cm-session-panel';
    panel.innerHTML = `<strong>Recent Session</strong><div id="cm-session-list"></div>`;
    document.body.appendChild(panel);

    const list = panel.querySelector('#cm-session-list');
    const sessions = getSessions();
    list.innerHTML = sessions.length ? sessions.map((s) => `
      <div class="cm-session-item">
        <div>${(s.question || 'Untitled draft').slice(0, 48)}</div>
        <small>${s.language || 'javascript'} · ${s.mode || 'solve'} · ${new Date(s.savedAt || Date.now()).toLocaleString()}</small>
      </div>
    `).join('') : '<div class="cm-session-item"><small>No saved session draft yet.</small></div>';
  }

  window.addEventListener('load', mountSessions, { once: true });
})();
