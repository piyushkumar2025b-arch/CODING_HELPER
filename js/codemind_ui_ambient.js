(function () {
  'use strict';

  function mountAmbient() {
    if (document.getElementById('cm-ambient-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'cm-ambient-badge';
    badge.className = 'cm-micro-badge cm-spectrum-chip cm-motion-soft';
    badge.style.position = 'fixed';
    badge.style.right = '18px';
    badge.style.bottom = '18px';
    badge.style.zIndex = '2147483646';
    badge.textContent = 'Ambient UI active';
    document.body.appendChild(badge);
  }

  window.addEventListener('load', () => {
    mountAmbient();
    setTimeout(() => document.getElementById('cm-ambient-badge')?.remove(), 4500);
  }, { once: true });
})();
