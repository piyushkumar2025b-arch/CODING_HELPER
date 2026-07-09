(function () {
  'use strict';

  const TARGETS = [
    { label: 'Theme switcher', run: () => document.getElementById('cm-site-theme-switcher')?.classList.toggle('open') },
    { label: 'Feature cards', run: () => document.getElementById('cm-site-features')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
    { label: 'Agent gateway', run: () => window.CodeMindSite?.showAgentsGateway?.() },
    { label: 'Email agent', run: () => window.CodeMindSite?.showEmailAgent?.() },
    { label: 'Music player', run: () => window.CodeMindSite?.showMusicPlayer?.() },
    { label: 'Web search', run: () => window.CodeMindSite?.showWebSearchAgent?.() },
    { label: 'Chat agent', run: () => window.CodeMindSite?.showChatAgent?.() },
    { label: 'Photos', run: () => window.CodeMindSite?.showPhotosAgent?.() },
    { label: 'Video maker', run: () => window.CodeMindSite?.showVideoAgent?.() },
    { label: 'Local database', run: () => window.CodeMindSite?.showDbPanel?.() },
    { label: 'Streamlit notice', run: () => window.CodeMindSite?.showDatabaseUnavailableNotice?.() },
  ];

  function mountSearch() {
    if (document.getElementById('cm-site-search')) return;
    const shell = document.createElement('div');
    shell.id = 'cm-site-search';
    shell.className = 'cm-site-search';
    shell.innerHTML = `
      <input type="search" placeholder="Search site features, widgets, actions..." aria-label="Search site features" />
      <div class="cm-site-search-results"></div>
    `;
    document.body.appendChild(shell);

    const input = shell.querySelector('input');
    const results = shell.querySelector('.cm-site-search-results');

    function render(value) {
      const q = value.trim().toLowerCase();
      const rows = TARGETS.filter((item) => item.label.toLowerCase().includes(q));
      results.innerHTML = rows.length ? rows.map((item, index) => `<button type="button" data-idx="${index}">${item.label}</button>`).join('') : '<button type="button" disabled>No matches</button>';
      results.querySelectorAll('button[data-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const item = rows[Number(btn.dataset.idx)];
          shell.classList.remove('open');
          item?.run?.();
        });
      });
    }

    input.addEventListener('input', (e) => render(e.target.value));
    document.addEventListener('cm:open-site-search', () => {
      shell.classList.add('open');
      input.focus();
      render(input.value);
    });
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        shell.classList.add('open');
        input.focus();
        render(input.value);
      }
      if (e.key === 'Escape') shell.classList.remove('open');
    });
  }

  window.addEventListener('load', mountSearch, { once: true });
})();
