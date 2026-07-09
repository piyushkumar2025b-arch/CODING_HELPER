(function () {
  'use strict';

  function normalizeSpacing() {
    const root = document.documentElement;
    root.style.setProperty('--cm-space', '14px');
    root.style.setProperty('--cm-space-lg', '20px');
  }

  normalizeSpacing();
})();
