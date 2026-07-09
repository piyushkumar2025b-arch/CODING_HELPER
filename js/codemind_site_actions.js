(function () {
  'use strict';

  function openQuickActions() {
    let pop = document.getElementById('cm-actions-popover');
    if (pop) { pop.remove(); return; }

    pop = document.createElement('div');
    pop.id = 'cm-actions-popover';
    pop.className = 'cm-widget cm-widget-panel cm-action-popover';
    pop.style.left = '18px';
    pop.style.bottom = '74px';
    pop.innerHTML = `
      <h5>Quick Actions</h5>
      <button type="button" class="cm-action-item" data-action="agents">Agent gateway</button>
      <button type="button" class="cm-action-item" data-action="email-agent">Email agent</button>
      <button type="button" class="cm-action-item" data-action="music-player">Music player</button>
      <button type="button" class="cm-action-item" data-action="web-search">Web search</button>
      <button type="button" class="cm-action-item" data-action="chat-agent">Chat agent</button>
      <button type="button" class="cm-action-item" data-action="photos">Photos</button>
      <button type="button" class="cm-action-item" data-action="video-maker">Video maker</button>
      <button type="button" class="cm-action-item" data-action="theme">Switch theme</button>
      <button type="button" class="cm-action-item" data-action="search">Search the site</button>
      <button type="button" class="cm-action-item" data-action="sessions">Saved sessions</button>
      <button type="button" class="cm-action-item" data-action="db">Local database</button>
    `;
    pop.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'agents') window.CodeMindSite?.showAgentsGateway?.();
        if (action === 'email-agent') window.CodeMindSite?.showEmailAgent?.();
        if (action === 'music-player') window.CodeMindSite?.showMusicPlayer?.();
        if (action === 'web-search') window.CodeMindSite?.showWebSearchAgent?.();
        if (action === 'chat-agent') window.CodeMindSite?.showChatAgent?.();
        if (action === 'photos') window.CodeMindSite?.showPhotosAgent?.();
        if (action === 'video-maker') window.CodeMindSite?.showVideoAgent?.();
        if (action === 'theme') document.getElementById('cm-site-theme-switcher')?.classList.toggle('open');
        if (action === 'search') document.dispatchEvent(new CustomEvent('cm:open-site-search'));
        if (action === 'sessions') window.CodeMindSite?.showDbPanel?.();
        if (action === 'db') window.CodeMindSite?.showDbPanel?.();
      });
    });
    document.body.appendChild(pop);
  }

  function mountLauncher() {
    if (document.getElementById('cm-actions-launcher')) return;
    const wrap = document.createElement('div');
    wrap.id = 'cm-actions-launcher';
    wrap.className = 'cm-actions-launcher';
    wrap.innerHTML = `<button type="button" class="cm-actions-button">Quick Actions</button>`;
    wrap.querySelector('button').addEventListener('click', openQuickActions);
    document.body.appendChild(wrap);
  }

  window.addEventListener('load', mountLauncher, { once: true });
})();
