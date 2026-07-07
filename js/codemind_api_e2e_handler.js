(function CodeMindApiE2EHandler() {
  'use strict';

  const API_REQUIREMENTS = [
    { id: 'gemini', label: 'Gemini AI', key: 'cm_gemini_key', feature: 'ai' },
    { id: 'judge0', label: 'Judge0 Runner', key: 'cm_j0_key', feature: 'judge0' },
    { id: 'github', label: 'GitHub/Gists', key: 'cm_gh_token', feature: 'github' },
    { id: 'docs', label: 'Docs Search', feature: 'docs' },
    { id: 'devtools', label: 'Dev Tools', feature: 'devtools' },
    { id: 'runner', label: 'Local Runner', feature: 'runner' },
    { id: 'sql', label: 'SQL Playground', feature: 'sql' }
  ];

  function hasKey(item) {
    return !item.key || !!localStorage.getItem(item.key);
  }

  async function runApiController() {
    if (!window._cmATP || typeof window._cmATP.runAll !== 'function') {
      return { ok: false, message: 'API controller is not loaded' };
    }

    await window._cmATP.runAll();
    if (typeof window._cmATP.injectKeys === 'function') window._cmATP.injectKeys();
    if (window.CodeMindFeatures) window.CodeMindFeatures.syncKeys();
    return { ok: true, message: 'API controller finished' };
  }

  function auditEndToEnd() {
    const featureStates = window.CodeMindFeatures
      ? window.CodeMindFeatures.audit()
      : [];

    const byId = new Map(featureStates.map(state => [state.id, state]));
    const results = API_REQUIREMENTS.map(item => {
      const feature = byId.get(item.feature);
      const keyReady = hasKey(item);
      const ready = keyReady && (!feature || feature.ready);
      return {
        id: item.id,
        label: item.label,
        ready,
        keyReady,
        featureReady: feature ? feature.ready : true,
        message: ready
          ? 'Ready'
          : !keyReady
            ? 'Missing key'
            : feature && !feature.ready
              ? (feature.reason || 'Feature not ready')
              : 'Not ready'
      };
    });

    window.dispatchEvent(new CustomEvent('codemind:api-e2e-audited', { detail: results }));
    return results;
  }

  async function ensureEveryApiWorks() {
    const controller = await runApiController();
    const results = auditEndToEnd();
    const failed = results.filter(item => !item.ready);
    return {
      ok: controller.ok && failed.length === 0,
      controller,
      results,
      failed
    };
  }

  function showMiniBadge(results) {
    const old = document.getElementById('cm-e2e-badge');
    if (old) old.remove();

    const ready = results.filter(item => item.ready).length;
    const badge = document.createElement('button');
    badge.id = 'cm-e2e-badge';
    badge.type = 'button';
    badge.className = 'cm-neon-hover';
    badge.textContent = `E2E ${ready}/${results.length}`;
    badge.title = 'Run end-to-end API and feature checks';
    badge.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:92px',
      'z-index:99998',
      'border:1px solid rgba(0,229,255,.45)',
      'background:rgba(17,17,24,.9)',
      'color:#e8e8f0',
      'border-radius:8px',
      'padding:8px 12px',
      "font-family:'JetBrains Mono',monospace",
      'font-size:11px',
      'font-weight:800',
      'cursor:pointer',
      'box-shadow:0 10px 30px rgba(0,0,0,.35)'
    ].join(';');
    badge.onclick = async () => {
      badge.textContent = 'E2E...';
      const report = await ensureEveryApiWorks();
      showReport(report);
      showMiniBadge(report.results);
    };
    document.body.appendChild(badge);
  }

  function showReport(report) {
    const old = document.getElementById('cm-e2e-report');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = 'cm-e2e-report';
    panel.className = 'cm-glass';
    panel.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:140px',
      'width:min(380px,calc(100vw - 36px))',
      'max-height:55vh',
      'overflow:auto',
      'z-index:99999',
      'border:1px solid rgba(0,229,255,.35)',
      'border-radius:10px',
      'background:rgba(17,17,24,.96)',
      'box-shadow:0 18px 60px rgba(0,0,0,.5)',
      "font-family:'JetBrains Mono',monospace",
      'color:#e8e8f0'
    ].join(';');

    const rows = report.results.map(item => {
      const color = item.ready ? 'var(--accent3)' : item.keyReady ? 'var(--warn)' : 'var(--danger)';
      const status = item.ready ? 'WORKING' : item.keyReady ? 'CHECK' : 'MISSING KEY';
      return `<div style="display:grid;grid-template-columns:92px 1fr;gap:8px;padding:9px 12px;border-top:1px solid rgba(255,255,255,.06);">
        <div style="font-size:10px;font-weight:900;color:${color};">${status}</div>
        <div>
          <div style="font-size:12px;font-weight:800;color:var(--text);">${item.label}</div>
          <div style="font-size:10px;line-height:1.5;color:var(--muted);">${item.message}</div>
        </div>
      </div>`;
    }).join('');

    panel.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 12px;">
      <div>
        <div style="font-size:12px;font-weight:900;color:var(--accent);">Live API Test</div>
        <div style="font-size:10px;color:var(--muted);">${report.ok ? 'All checked APIs and features are ready.' : 'Some APIs need attention. Reasons are listed below.'}</div>
      </div>
      <button type="button" onclick="document.getElementById('cm-e2e-report')?.remove()" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:5px 8px;cursor:pointer;">Close</button>
    </div>${rows}`;

    document.body.appendChild(panel);
  }

  async function init() {
    if (window.CodeMindFeatures) window.CodeMindFeatures.syncKeys();
    const results = auditEndToEnd();
    showMiniBadge(results);
  }

  window.CodeMindApiE2E = {
    audit: auditEndToEnd,
    run: ensureEveryApiWorks,
    runApiController,
    showReport
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
