(function () {
  'use strict';

  function upgradeWidgets() {
    document.querySelectorAll('.cm-widget').forEach((widget) => {
      widget.classList.add('cm-hover-lift', 'cm-focus-ring');
    });
  }

  function watchWidgets() {
    upgradeWidgets();
    new MutationObserver(upgradeWidgets).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchWidgets, { once: true });
  else watchWidgets();
})();
