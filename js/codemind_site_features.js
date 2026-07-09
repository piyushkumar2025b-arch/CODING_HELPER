(function () {
  'use strict';

  function mountFeatures() {
    if (document.getElementById('cm-site-features')) return;
    const panel = document.createElement('section');
    panel.id = 'cm-site-features';
    panel.className = 'cm-site-layout cm-site-wide';
    panel.innerHTML = `
      <div class="cm-feature-strip">
        <article class="cm-feature-card cm-spotlight">
          <h4>Theme aware UI</h4>
          <p>Website-only skins with instant switching and saved preference.</p>
        </article>
        <article class="cm-feature-card cm-spotlight">
          <h4>Spotlight mode</h4>
          <p>Hover energy and contrast keep important actions easier to scan.</p>
        </article>
        <article class="cm-feature-card cm-spotlight">
          <h4>Widget layer</h4>
          <p>Floating helper cards can be extended for stats, tips, or shortcuts.</p>
        </article>
      </div>
    `;
    document.getElementById('app')?.prepend(panel);
  }

  window.addEventListener('load', mountFeatures, { once: true });
})();
