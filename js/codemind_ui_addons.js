(function () {
  'use strict';

  function ensureBackdrop() {
    if (document.querySelector('.cm-fx-frame')) return;
    const frame = document.createElement('div');
    frame.className = 'cm-fx-frame';
    document.body.appendChild(frame);
  }

  function tagAppSurfaces() {
    document.getElementById('app')?.classList.add('cm-grid-veil', 'cm-scroll-accent');
    document.querySelectorAll('header, .main, .sidebar, .panel').forEach((el) => {
      el.classList.add('cm-panel-lift');
    });
  }

  function wireQuickStats() {
    const host = document.getElementById('cm-toast-stack') || document.body;
    const badge = document.createElement('div');
    badge.className = 'cm-pill cm-pill--accent';
    badge.style.position = 'fixed';
    badge.style.left = '18px';
    badge.style.bottom = '18px';
    badge.style.zIndex = '2147483646';
    badge.textContent = 'UI power layer active';
    host.appendChild(badge);
    setTimeout(() => badge.remove(), 5000);
  }

  function boot() {
    ensureBackdrop();
    tagAppSurfaces();
    wireQuickStats();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
