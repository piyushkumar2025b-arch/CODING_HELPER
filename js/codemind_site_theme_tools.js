(function () {
  'use strict';

  function addThemeShortcuts() {
    if (document.getElementById('cm-theme-shortcuts')) return;
    const tip = document.createElement('div');
    tip.id = 'cm-theme-shortcuts';
    tip.className = 'cm-widget cm-widget-panel cm-fade-up';
    tip.innerHTML = `
      <h5>Theme tools</h5>
      <small>Use the floating theme buttons to switch site skins.</small>
      <div class="cm-widget-row"><strong>Saved</strong><span>localStorage</span></div>
      <div class="cm-widget-row"><strong>Modes</strong><span>5 skins</span></div>
    `;
    document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 5000);
  }

  window.addEventListener('load', addThemeShortcuts, { once: true });
})();
