(function () {
  'use strict';

  function applyLayers() {
    document.body.classList.add('cm-motion-soft');
    document.getElementById('app')?.classList.add('cm-shell-grid', 'cm-canvas-shell');
    document.querySelectorAll('header, .main, .sidebar, .panel, .editor-area').forEach((el) => {
      el.classList.add('cm-depth-card', 'cm-glow-hover');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLayers, { once: true });
  } else {
    applyLayers();
  }
})();
