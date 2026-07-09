(function () {
  'use strict';

  function enhanceFeatureCards() {
    document.querySelectorAll('.cm-feature-card').forEach((card, index) => {
      card.classList.add('cm-hover-lift', 'cm-interactive-hit');
      if (card.dataset.cmEnhanced) return;
      card.dataset.cmEnhanced = '1';
      const actions = document.createElement('div');
      actions.className = 'cm-feature-actions';
      actions.innerHTML = `
        <button type="button" class="cm-mini-btn">Pin</button>
        <button type="button" class="cm-mini-btn">Open</button>
      `;
      card.appendChild(actions);
      actions.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.stopPropagation();
          card.classList.toggle('cm-feature-pinned');
        });
      });
      card.addEventListener('click', () => {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      card.style.animationDelay = `${index * 80}ms`;
      card.classList.add('cm-fade-up');
    });
  }

  function boot() {
    enhanceFeatureCards();
    const observer = new MutationObserver(enhanceFeatureCards);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
