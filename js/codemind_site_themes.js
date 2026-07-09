(function () {
  'use strict';

  const THEMES = ['midnight', 'aurora', 'sunset', 'violet', 'mono'];
  const KEY = 'cm_site_theme';

  function setTheme(theme) {
    document.documentElement.setAttribute('data-site-theme', theme);
    document.body.classList.add('cm-site-theme-enabled');
    localStorage.setItem(KEY, theme);
    document.querySelectorAll('[data-site-theme-btn]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.siteThemeBtn === theme);
    });
  }

  function mountSwitcher() {
    if (document.getElementById('cm-site-theme-switcher')) return;
    const wrap = document.createElement('div');
    wrap.id = 'cm-site-theme-switcher';
    wrap.className = 'cm-theme-float';
    wrap.innerHTML = THEMES.map((theme) => `<button type="button" data-site-theme-btn="${theme}">${theme}</button>`).join('');
    wrap.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => setTheme(btn.dataset.siteThemeBtn));
    });
    document.body.appendChild(wrap);
  }

  function boot() {
    mountSwitcher();
    setTheme(localStorage.getItem(KEY) || 'midnight');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
