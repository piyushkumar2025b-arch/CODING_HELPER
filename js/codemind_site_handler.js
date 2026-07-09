(function CodeMindSiteHandler() {
  'use strict';

  const DB_NAME = 'codemind_local_db';
  const DB_VERSION = 1;
  const CONVERSATIONS = 'conversations';
  const DRAFT_KEY = 'cm_local_draft';
  const isStreamlit = !!window.CODEMIND_STREAMLIT_MODE;
  const isCloudStreamlit = !!window.CODEMIND_STREAMLIT_CLOUD_MODE;
  const isLocalHost = ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname);
  const localDbEnabled = isLocalHost && !isCloudStreamlit && ('indexedDB' in window);
  const localDbUrl = window.CODEMIND_LOCAL_DB_URL || 'http://127.0.0.1:8787';
  const supabaseUrl = window.CODEMIND_SUPABASE_URL || localStorage.getItem('cm_supabase_url') || '';
  const supabaseAnonKey = window.CODEMIND_SUPABASE_ANON_KEY || localStorage.getItem('cm_supabase_anon') || '';
  const supabaseEnabled = !!(supabaseUrl && supabaseAnonKey);
  const supabaseRestUrl = supabaseEnabled ? `${supabaseUrl.replace(/\/$/, '')}/rest/v1` : '';
  const supabaseAuthUrl = supabaseEnabled ? `${supabaseUrl.replace(/\/$/, '')}/auth/v1` : '';
  const SUPABASE_TABLE = 'codemind_conversations';
  const SUPABASE_HEADERS = supabaseEnabled ? {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  } : {};
  const CONNECTOR_SKIP_KEY = 'cm_connector_skips';
  let sqliteAvailable = false;
  let supabaseSession = null;
  let supabaseUser = null;
  let supabaseReady = false;
  let dbPromise = null;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function loadSkippedConnectors() {
    try {
      return new Set(JSON.parse(localStorage.getItem(CONNECTOR_SKIP_KEY) || '[]'));
    } catch (_) {
      return new Set();
    }
  }

  function persistSkippedConnectors(set) {
    localStorage.setItem(CONNECTOR_SKIP_KEY, JSON.stringify([...set]));
  }

  function isConnectorSkipped(id) {
    return loadSkippedConnectors().has(id);
  }

  function setConnectorSkipped(id, skipped) {
    const set = loadSkippedConnectors();
    if (skipped) set.add(id);
    else set.delete(id);
    persistSkippedConnectors(set);
  }

  function openDb() {
    if (!localDbEnabled) return Promise.resolve(null);
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CONVERSATIONS)) {
          const store = db.createObjectStore(CONVERSATIONS, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('mode', 'mode');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function dbWrite(storeName, mode, callback) {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = callback(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function dbReadAll() {
    const db = await openDb();
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CONVERSATIONS, 'readonly');
      const req = tx.objectStore(CONVERSATIONS).getAll();
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.createdAt - a.createdAt));
      req.onerror = () => reject(req.error);
    });
  }

  async function checkSqlite() {
    if (!isLocalHost || isCloudStreamlit) return false;
    try {
      const res = await fetch(`${localDbUrl}/health`, { cache: 'no-store' });
      const data = await res.json();
      sqliteAvailable = !!data.ok;
      return sqliteAvailable;
    } catch (_) {
      sqliteAvailable = false;
      return false;
    }
  }

  async function sqliteSave(item) {
    if (!sqliteAvailable) return false;
    try {
      const res = await fetch(`${localDbUrl}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      return res.ok;
    } catch (_) {
      sqliteAvailable = false;
      return false;
    }
  }

  async function sqliteList() {
    if (!sqliteAvailable) return null;
    try {
      const res = await fetch(`${localDbUrl}/conversations`, { cache: 'no-store' });
      const data = await res.json();
      return data.ok ? data.items || [] : null;
    } catch (_) {
      sqliteAvailable = false;
      return null;
    }
  }

  async function sqliteClear() {
    if (!sqliteAvailable) return false;
    try {
      const res = await fetch(`${localDbUrl}/conversations`, { method: 'DELETE' });
      return res.ok;
    } catch (_) {
      sqliteAvailable = false;
      return false;
    }
  }

  const agentFeatureLinks = [
    { label: 'AI Assistant', target: () => document.querySelector('[data-tab="ai"]')?.click?.() || document.querySelector('[data-panel="ai"]')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) },
    { label: 'Docs Search', target: () => document.querySelector('[data-tab="docs"]')?.click?.() || document.getElementById('cm-site-features')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) },
    { label: 'Dev Tools', target: () => document.querySelector('[data-tab="devtools"]')?.click?.() || document.getElementById('cm-site-features')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) },
    { label: 'SQL Playground', target: () => document.querySelector('[data-tab="sql"]')?.click?.() || document.getElementById('cm-site-features')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) },
    { label: 'Conversation DB', target: () => showDbPanel() },
    { label: 'Email Agent', target: () => showEmailAgent() },
    { label: 'Drive Agent', target: () => showDriveAgent() },
    { label: 'YouTube Agent', target: () => showYouTubeAgent() },
    { label: 'Music Player', target: () => showMusicPlayer() },
    { label: 'Web Search', target: () => showWebSearchAgent() },
    { label: 'Chat Agent', target: () => showChatAgent() },
    { label: 'Photos', target: () => showPhotosAgent() },
    { label: 'Video Maker', target: () => showVideoAgent() },
  ];

  const connectorSpecs = [
    { id: 'supabase', label: 'Supabase DB', group: 'core', kind: 'database', optional: true },
    { id: 'google-email', label: 'Email Agent', group: 'google', kind: 'gmail', optional: true },
    { id: 'google-drive', label: 'Drive Agent', group: 'google', kind: 'drive', optional: true },
    { id: 'google-youtube', label: 'YouTube Agent', group: 'google', kind: 'youtube', optional: true },
    { id: 'music-player', label: 'Music Player', group: 'media', kind: 'music', optional: true },
    { id: 'web-search', label: 'Web Search', group: 'web', kind: 'search', optional: true },
    { id: 'chat-agent', label: 'Chat Agent', group: 'web', kind: 'chat', optional: true },
    { id: 'photos', label: 'Photos', group: 'media', kind: 'photos', optional: true },
    { id: 'video-maker', label: 'Video Maker', group: 'media', kind: 'video', optional: true },
  ];

  function loadGoogleIdentityScript() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (window.__cmGoogleIdPromise) return window.__cmGoogleIdPromise;
    window.__cmGoogleIdPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-cm-gsi]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Google identity loader failed.')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.cmGsi = '1';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google identity loader failed.'));
      document.head.appendChild(script);
    });
    return window.__cmGoogleIdPromise;
  }

  function googleClientId() {
    return window.CODEMIND_GOOGLE_CLIENT_ID || localStorage.getItem('cm_google_client_id') || '';
  }

  async function googleAuthorize(scopes) {
    const clientId = googleClientId();
    if (!clientId) throw new Error('Add your Google OAuth client ID first.');
    await loadGoogleIdentityScript();
    return new Promise((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes.join(' '),
        callback: (response) => {
          if (response?.access_token) resolve(response.access_token);
          else reject(new Error(response?.error_description || response?.error || 'Google auth failed.'));
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  function encodeEmailMessage({ to, subject, body }) {
    const lines = [
      `To: ${to}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      body,
    ];
    const raw = lines.join('\r\n');
    return btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  async function sendGmailMessage(accessToken, message) {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodeEmailMessage(message) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || 'Could not send email.');
    return data;
  }

  async function listDriveFiles(accessToken) {
    const res = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType,modifiedTime)', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || 'Could not read Drive files.');
    return data.files || [];
  }

  async function listYouTubeSubscriptions(accessToken) {
    const res = await fetch('https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=10', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || 'Could not read YouTube subscriptions.');
    return data.items || [];
  }

  async function searchArchiveSongs(query) {
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(`${query} AND mediatype:audio`)}&fl[]=identifier,publicdate,title,creator,description&rows=10&page=1&output=json`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    const docs = data?.response?.docs || [];
    return docs.map((doc) => ({
      id: doc.identifier,
      title: doc.title || doc.identifier,
      creator: doc.creator || '',
      stream: `https://archive.org/download/${doc.identifier}/${doc.identifier}_64kb.mp3`,
      page: `https://archive.org/details/${doc.identifier}`,
    }));
  }

  async function fetchRadioStations(query = '') {
    const url = `https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(query || '')}&limit=20&hidebroken=true&order=clickcount&reverse=true`;
    const res = await fetch(url);
    const data = await res.json().catch(() => []);
    return (data || []).slice(0, 20).map((s) => ({
      id: s.stationuuid,
      name: s.name,
      country: s.country,
      url: s.url_resolved || s.url,
      codec: s.codec,
    }));
  }

  async function webSearchDuckDuckGo(query) {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    const results = [];
    if (data?.AbstractText) results.push({ title: data.Heading || query, url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, snippet: data.AbstractText });
    (data?.RelatedTopics || []).forEach((item) => {
      if (item.Text && item.FirstURL) results.push({ title: item.Text.split(' - ')[0] || query, url: item.FirstURL, snippet: item.Text });
      (item.Topics || []).forEach((sub) => {
        if (sub.Text && sub.FirstURL) results.push({ title: sub.Text.split(' - ')[0] || query, url: sub.FirstURL, snippet: sub.Text });
      });
    });
    return results.slice(0, 10);
  }

  async function webSearchWikipedia(query) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    const items = data?.query?.search || [];
    return items.slice(0, 10).map((item) => ({
      title: item.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      snippet: item.snippet?.replace(/<[^>]+>/g, '') || '',
    }));
  }

  async function chatAgentReply(prompt) {
    const maybeGemini = window.askAI || window.CodeMindAI?.askAI;
    if (typeof maybeGemini === 'function') {
      try {
        return await maybeGemini(prompt);
      } catch (_) {}
    }
    return `I can help with that. Try asking in the main AI Assistant, or connect a free model endpoint if you want a custom chat backend.`;
  }

  async function openversePhotos(query) {
    const url = `https://api.openverse.org/v1/images?q=${encodeURIComponent(query)}&page_size=20&license_type=public_domain,cc0,by,by-sa`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    return (data?.results || []).map((img) => ({
      id: img.id,
      title: img.title || 'Photo',
      thumb: img.thumbnail || img.url,
      url: img.url,
      source: img.foreign_landing_url || img.url,
      author: img.creator || img.attribution || 'Openverse',
    })).slice(0, 12);
  }

  async function buildVideoFromPhotos(query) {
    const pics = await openversePhotos(query);
    if (!pics.length) throw new Error('No photos found for the video.');
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const drawFrame = async (img, title) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px Syne, sans-serif';
      ctx.fillText(title.slice(0, 44), 60, 80);
      ctx.drawImage(img, 0, 120, 1160, 540);
    };

    const loadImage = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load image for video.'));
      img.src = src;
    });

    recorder.start();
    for (const pic of pics.slice(0, 6)) {
      const img = await loadImage(pic.url);
      await drawFrame(img, pic.title);
      await wait(1800);
    }
    recorder.stop();
    const blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    });
    return { blob, cover: pics[0] };
  }

  function featureCardsHtml() {
    return agentFeatureLinks.map((item) => `
      <button type="button" data-agent-link="${item.label}" style="width:100%;text-align:left;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:var(--text);padding:10px 12px;border-radius:10px;cursor:pointer;margin-bottom:8px">
        <div style="font-size:12px;font-weight:900">${item.label}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:3px">Open the feature linked to this agent.</div>
      </button>
    `).join('');
  }

  function connectorCardHtml(spec) {
    const skipped = isConnectorSkipped(spec.id);
    return `
      <div style="border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:10px;padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <div>
            <div style="font-size:12px;font-weight:900">${spec.label}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:3px">${skipped ? 'Skipped for now.' : 'Available to set up.'}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" data-setup-id="${spec.id}" style="border:1px solid rgba(34,197,94,.35);background:rgba(34,197,94,.12);color:#bbf7d0;border-radius:8px;padding:7px 10px;cursor:pointer">Set up</button>
            <button type="button" data-skip-id="${spec.id}" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:8px;padding:7px 10px;cursor:pointer">${skipped ? 'Unskip' : 'Skip'}</button>
          </div>
        </div>
      </div>`;
  }

  function setupConnector(specId) {
    if (specId === 'supabase') return showDbPanel();
    if (specId === 'google-email') return showEmailAgent();
    if (specId === 'google-drive') return showDriveAgent();
    if (specId === 'google-youtube') return showYouTubeAgent();
    if (specId === 'music-player') return showMusicPlayer();
  }

  function showAgentsGateway() {
    const old = document.getElementById('cm-agents-gateway');
    if (old) { old.remove(); return; }
    const skippedAll = connectorSpecs.every((item) => isConnectorSkipped(item.id));
    const panel = document.createElement('div');
    panel.id = 'cm-agents-gateway';
    panel.className = 'cm-glass';
    panel.style.cssText = [
      'position:fixed',
      'left:18px',
      'bottom:236px',
      'width:min(420px,calc(100vw - 36px))',
      'max-height:62vh',
      'overflow:auto',
      'z-index:100000',
      'border:1px solid rgba(59,130,246,.35)',
      'border-radius:12px',
      'background:rgba(17,17,24,.96)',
      'box-shadow:0 18px 60px rgba(0,0,0,.52)',
      "font-family:'JetBrains Mono',monospace",
      'color:#e8e8f0'
    ].join(';');
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px">
        <div>
          <div style="font-size:12px;font-weight:900;color:var(--accent3)">Agent Gateway</div>
          <div style="font-size:10px;color:var(--muted);line-height:1.5">Feature-to-agent links for the workspace.</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
          <button type="button" id="cm-agents-skip-all" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">${skippedAll ? 'Restore all' : 'Skip all'}</button>
          <button type="button" id="cm-agents-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Close</button>
        </div>
      </div>
      <div style="padding:0 12px 12px">
        <div style="font-size:10px;color:var(--muted);line-height:1.5;margin-bottom:8px">
          Set these up now or skip them and come back later.
        </div>
        ${connectorSpecs.map(connectorCardHtml).join('')}
        ${featureCardsHtml()}
      </div>`;
    document.body.appendChild(panel);
    panel.querySelectorAll('[data-setup-id]').forEach((btn) => {
      btn.addEventListener('click', () => setupConnector(btn.dataset.setupId));
    });
    panel.querySelectorAll('[data-skip-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.skipId;
        const skipped = isConnectorSkipped(id);
        setConnectorSkipped(id, !skipped);
        panel.remove();
        showAgentsGateway();
      });
    });
    document.getElementById('cm-agents-skip-all')?.addEventListener('click', () => {
      const set = loadSkippedConnectors();
      const shouldSkip = !connectorSpecs.every((item) => set.has(item.id));
      connectorSpecs.forEach((item) => {
        if (shouldSkip) set.add(item.id);
        else set.delete(item.id);
      });
      persistSkippedConnectors(set);
      panel.remove();
      showAgentsGateway();
    });
    panel.querySelectorAll('[data-agent-link]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const link = agentFeatureLinks.find((entry) => entry.label === btn.dataset.agentLink);
        link?.target?.();
      });
    });
    document.getElementById('cm-agents-close')?.addEventListener('click', () => panel.remove());
  }

  async function showEmailAgent() {
    const old = document.getElementById('cm-email-agent');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'cm-email-agent';
    panel.className = 'cm-glass';
    panel.style.cssText = [
      'position:fixed',
      'left:18px',
      'bottom:236px',
      'width:min(460px,calc(100vw - 36px))',
      'max-height:68vh',
      'overflow:auto',
      'z-index:100001',
      'border:1px solid rgba(34,197,94,.35)',
      'border-radius:12px',
      'background:rgba(17,17,24,.98)',
      'box-shadow:0 18px 60px rgba(0,0,0,.52)',
      "font-family:'JetBrains Mono',monospace",
      'color:#e8e8f0'
    ].join(';');
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px">
        <div>
          <div style="font-size:12px;font-weight:900;color:var(--accent3)">Email Agent</div>
          <div style="font-size:10px;color:var(--muted);line-height:1.5">Uses Google sign-in and Gmail send permissions.</div>
        </div>
        <button type="button" id="cm-email-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Close</button>
      </div>
      <div style="padding:0 12px 12px;display:grid;gap:8px">
        <input id="cm-email-to" placeholder="To" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px">
        <input id="cm-email-subject" placeholder="Subject" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px">
        <textarea id="cm-email-body" placeholder="Write your email..." rows="8" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px;resize:vertical"></textarea>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input id="cm-google-client-id" placeholder="Google OAuth Client ID" value="${googleClientId()}" style="flex:1;min-width:220px;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px">
          <button type="button" id="cm-google-save" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:8px;padding:10px 12px;cursor:pointer">Save</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" id="cm-google-auth" style="border:1px solid rgba(34,197,94,.35);background:rgba(34,197,94,.12);color:#bbf7d0;border-radius:8px;padding:10px 12px;cursor:pointer">Google auth</button>
          <button type="button" id="cm-email-send" style="border:1px solid rgba(59,130,246,.35);background:rgba(59,130,246,.12);color:#bfdbfe;border-radius:8px;padding:10px 12px;cursor:pointer">Send email</button>
        </div>
        <div id="cm-email-status" style="font-size:11px;color:var(--muted);line-height:1.5">Connect Google, then send directly from Gmail.</div>
      </div>`;
    document.body.appendChild(panel);
    const status = () => document.getElementById('cm-email-status');
    document.getElementById('cm-google-save')?.addEventListener('click', () => {
      const clientId = document.getElementById('cm-google-client-id')?.value?.trim() || '';
      localStorage.setItem('cm_google_client_id', clientId);
      if (status()) status().textContent = clientId ? 'Google OAuth client ID saved.' : 'Google OAuth client ID cleared.';
    });
    document.getElementById('cm-google-auth')?.addEventListener('click', async () => {
      try {
        const token = await googleAuthorize([
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'openid'
        ]);
        localStorage.setItem('cm_google_email_token', token);
        if (status()) status().textContent = 'Google auth complete. Ready to send emails.';
      } catch (error) {
        if (status()) status().textContent = error?.message || 'Google auth failed.';
      }
    });
    document.getElementById('cm-email-send')?.addEventListener('click', async () => {
      const accessToken = localStorage.getItem('cm_google_email_token') || '';
      if (!accessToken) {
        if (status()) status().textContent = 'Authorize with Google first.';
        return;
      }
      const to = document.getElementById('cm-email-to')?.value?.trim() || '';
      const subject = document.getElementById('cm-email-subject')?.value?.trim() || '';
      const body = document.getElementById('cm-email-body')?.value?.trim() || '';
      if (!to || !subject || !body) {
        if (status()) status().textContent = 'Fill in To, Subject, and Body.';
        return;
      }
      try {
        await sendGmailMessage(accessToken, { to, subject, body });
        if (status()) status().textContent = 'Email sent through Gmail.';
      } catch (error) {
        if (status()) status().textContent = error?.message || 'Could not send email.';
      }
    });
    document.getElementById('cm-email-close')?.addEventListener('click', () => panel.remove());
  }

  async function showDriveAgent() {
    const old = document.getElementById('cm-drive-agent');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'cm-drive-agent';
    panel.className = 'cm-glass';
    panel.style.cssText = [
      'position:fixed',
      'left:18px',
      'bottom:236px',
      'width:min(460px,calc(100vw - 36px))',
      'max-height:68vh',
      'overflow:auto',
      'z-index:100002',
      'border:1px solid rgba(59,130,246,.35)',
      'border-radius:12px',
      'background:rgba(17,17,24,.98)',
      'box-shadow:0 18px 60px rgba(0,0,0,.52)',
      "font-family:'JetBrains Mono',monospace",
      'color:#e8e8f0'
    ].join(';');
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px">
        <div>
          <div style="font-size:12px;font-weight:900;color:var(--accent3)">Drive Agent</div>
          <div style="font-size:10px;color:var(--muted);line-height:1.5">Google-only connector for Drive files.</div>
        </div>
        <button type="button" id="cm-drive-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Close</button>
      </div>
      <div style="padding:0 12px 12px;display:grid;gap:8px">
        <input id="cm-drive-client-id" placeholder="Google OAuth Client ID" value="${googleClientId()}" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" id="cm-drive-save" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:8px;padding:10px 12px;cursor:pointer">Save</button>
          <button type="button" id="cm-drive-auth" style="border:1px solid rgba(34,197,94,.35);background:rgba(34,197,94,.12);color:#bbf7d0;border-radius:8px;padding:10px 12px;cursor:pointer">Google auth</button>
          <button type="button" id="cm-drive-skip" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:8px;padding:10px 12px;cursor:pointer">${isConnectorSkipped('google-drive') ? 'Unskip' : 'Skip'}</button>
        </div>
        <div id="cm-drive-status" style="font-size:11px;color:var(--muted);line-height:1.5">Authorize Drive to list your recent files.</div>
      </div>`;
    document.body.appendChild(panel);
    const status = () => document.getElementById('cm-drive-status');
    document.getElementById('cm-drive-save')?.addEventListener('click', () => {
      const clientId = document.getElementById('cm-drive-client-id')?.value?.trim() || '';
      localStorage.setItem('cm_google_client_id', clientId);
      if (status()) status().textContent = clientId ? 'Google OAuth client ID saved.' : 'Google OAuth client ID cleared.';
    });
    document.getElementById('cm-drive-auth')?.addEventListener('click', async () => {
      try {
        const token = await googleAuthorize(['https://www.googleapis.com/auth/drive.readonly', 'openid', 'https://www.googleapis.com/auth/userinfo.email']);
        const files = await listDriveFiles(token);
        if (status()) status().textContent = files.length ? `Drive connected. Found ${files.length} recent files.` : 'Drive connected. No recent files found.';
      } catch (error) {
        if (status()) status().textContent = error?.message || 'Drive auth failed.';
      }
    });
    document.getElementById('cm-drive-skip')?.addEventListener('click', () => {
      setConnectorSkipped('google-drive', !isConnectorSkipped('google-drive'));
      panel.remove();
      showDriveAgent();
    });
    document.getElementById('cm-drive-close')?.addEventListener('click', () => panel.remove());
  }

  async function showYouTubeAgent() {
    const old = document.getElementById('cm-youtube-agent');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'cm-youtube-agent';
    panel.className = 'cm-glass';
    panel.style.cssText = [
      'position:fixed',
      'left:18px',
      'bottom:236px',
      'width:min(460px,calc(100vw - 36px))',
      'max-height:68vh',
      'overflow:auto',
      'z-index:100003',
      'border:1px solid rgba(239,68,68,.35)',
      'border-radius:12px',
      'background:rgba(17,17,24,.98)',
      'box-shadow:0 18px 60px rgba(0,0,0,.52)',
      "font-family:'JetBrains Mono',monospace",
      'color:#e8e8f0'
    ].join(';');
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px">
        <div>
          <div style="font-size:12px;font-weight:900;color:var(--accent3)">YouTube Agent</div>
          <div style="font-size:10px;color:var(--muted);line-height:1.5">Google-only connector for YouTube access.</div>
        </div>
        <button type="button" id="cm-youtube-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Close</button>
      </div>
      <div style="padding:0 12px 12px;display:grid;gap:8px">
        <input id="cm-youtube-client-id" placeholder="Google OAuth Client ID" value="${googleClientId()}" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" id="cm-youtube-save" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:8px;padding:10px 12px;cursor:pointer">Save</button>
          <button type="button" id="cm-youtube-auth" style="border:1px solid rgba(34,197,94,.35);background:rgba(34,197,94,.12);color:#bbf7d0;border-radius:8px;padding:10px 12px;cursor:pointer">Google auth</button>
          <button type="button" id="cm-youtube-skip" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:8px;padding:10px 12px;cursor:pointer">${isConnectorSkipped('google-youtube') ? 'Unskip' : 'Skip'}</button>
        </div>
        <div id="cm-youtube-status" style="font-size:11px;color:var(--muted);line-height:1.5">Authorize YouTube to list your subscriptions.</div>
      </div>`;
    document.body.appendChild(panel);
    const status = () => document.getElementById('cm-youtube-status');
    document.getElementById('cm-youtube-save')?.addEventListener('click', () => {
      const clientId = document.getElementById('cm-youtube-client-id')?.value?.trim() || '';
      localStorage.setItem('cm_google_client_id', clientId);
      if (status()) status().textContent = clientId ? 'Google OAuth client ID saved.' : 'Google OAuth client ID cleared.';
    });
    document.getElementById('cm-youtube-auth')?.addEventListener('click', async () => {
      try {
        const token = await googleAuthorize(['https://www.googleapis.com/auth/youtube.readonly', 'openid', 'https://www.googleapis.com/auth/userinfo.email']);
        const subs = await listYouTubeSubscriptions(token);
        if (status()) status().textContent = subs.length ? `YouTube connected. Found ${subs.length} subscriptions.` : 'YouTube connected. No subscriptions found.';
      } catch (error) {
        if (status()) status().textContent = error?.message || 'YouTube auth failed.';
      }
    });
    document.getElementById('cm-youtube-skip')?.addEventListener('click', () => {
      setConnectorSkipped('google-youtube', !isConnectorSkipped('google-youtube'));
      panel.remove();
      showYouTubeAgent();
    });
    document.getElementById('cm-youtube-close')?.addEventListener('click', () => panel.remove());
  }

  function showMusicPlayer() {
    const old = document.getElementById('cm-music-player');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'cm-music-player';
    panel.className = 'cm-glass';
    panel.style.cssText = [
      'position:fixed',
      'left:18px',
      'bottom:18px',
      'width:min(420px,calc(100vw - 36px))',
      'height:320px',
      'resize:both',
      'overflow:hidden',
      'z-index:100004',
      'border:1px solid rgba(251,191,36,.38)',
      'border-radius:14px',
      'background:rgba(17,17,24,.98)',
      'box-shadow:0 18px 60px rgba(0,0,0,.55)',
      "font-family:'JetBrains Mono',monospace",
      'color:#e8e8f0'
    ].join(';');
    panel.innerHTML = `
      <div id="cm-music-drag" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;cursor:move;border-bottom:1px solid rgba(255,255,255,.08)">
        <div>
          <div style="font-size:12px;font-weight:900;color:var(--accent3)">Free Music Player</div>
          <div style="font-size:10px;color:var(--muted)">Archive songs, radio, and YouTube in one movable player.</div>
        </div>
        <button type="button" id="cm-music-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Close</button>
      </div>
      <div style="padding:10px 12px;display:grid;gap:8px;height:calc(100% - 46px);overflow:auto">
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" class="cm-music-mode" data-mode="songs" style="border:1px solid rgba(34,197,94,.35);background:rgba(34,197,94,.12);color:#bbf7d0;border-radius:8px;padding:7px 10px;cursor:pointer">Songs</button>
          <button type="button" class="cm-music-mode" data-mode="radio" style="border:1px solid rgba(59,130,246,.35);background:rgba(59,130,246,.12);color:#bfdbfe;border-radius:8px;padding:7px 10px;cursor:pointer">Radio</button>
          <button type="button" class="cm-music-mode" data-mode="youtube" style="border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.12);color:#fecaca;border-radius:8px;padding:7px 10px;cursor:pointer">YouTube</button>
        </div>
        <div id="cm-music-controls" style="display:grid;gap:8px">
          <input id="cm-music-query" placeholder="Search songs, stations, or paste a YouTube URL" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px">
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" id="cm-music-search" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:8px;padding:8px 10px;cursor:pointer">Search</button>
            <button type="button" id="cm-music-playurl" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:8px;padding:8px 10px;cursor:pointer">Play URL</button>
          </div>
        </div>
        <audio id="cm-music-audio" controls style="width:100%;display:none"></audio>
        <iframe id="cm-music-youtube" allow="autoplay; encrypted-media" allowfullscreen style="width:100%;height:0;border:0;border-radius:10px;display:none"></iframe>
        <div id="cm-music-results" style="display:grid;gap:6px"></div>
      </div>`;
    document.body.appendChild(panel);

    const drag = panel.querySelector('#cm-music-drag');
    let dragging = false, dx = 0, dy = 0;
    drag.addEventListener('pointerdown', (e) => {
      dragging = true;
      const rect = panel.getBoundingClientRect();
      dx = e.clientX - rect.left;
      dy = e.clientY - rect.top;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      drag.setPointerCapture(e.pointerId);
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      panel.style.left = `${Math.max(8, Math.min(window.innerWidth - 120, e.clientX - dx))}px`;
      panel.style.top = `${Math.max(8, Math.min(window.innerHeight - 80, e.clientY - dy))}px`;
    });
    window.addEventListener('pointerup', () => { dragging = false; });

    const audio = panel.querySelector('#cm-music-audio');
    const yt = panel.querySelector('#cm-music-youtube');
    const results = panel.querySelector('#cm-music-results');
    const query = panel.querySelector('#cm-music-query');
    let mode = 'songs';

    const setMode = (next) => {
      mode = next;
      panel.querySelectorAll('.cm-music-mode').forEach((b) => {
        const active = b.dataset.mode === mode;
        b.style.opacity = active ? '1' : '.7';
      });
      audio.style.display = mode === 'youtube' ? 'none' : 'block';
      yt.style.display = mode === 'youtube' ? 'block' : 'none';
      if (mode !== 'youtube') yt.style.height = '0';
    };
    panel.querySelectorAll('.cm-music-mode').forEach((btn) => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    setMode('songs');

    async function doSearch() {
      const q = query.value.trim();
      results.innerHTML = '<div style="color:var(--muted);font-size:11px">Loading...</div>';
      if (!q) {
        results.innerHTML = '<div style="color:var(--muted);font-size:11px">Enter a search query.</div>';
        return;
      }
      try {
        if (mode === 'radio') {
          const stations = await fetchRadioStations(q);
          results.innerHTML = stations.length ? stations.map((s) => `
            <button type="button" data-radio="${s.url}" style="text-align:left;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:var(--text);padding:8px 10px;border-radius:8px;cursor:pointer">
              <div style="font-size:12px;font-weight:900">${s.name}</div>
              <div style="font-size:10px;color:var(--muted)">${s.country || 'Unknown'} · ${s.codec || 'stream'}</div>
            </button>
          `).join('') : '<div style="font-size:11px;color:var(--muted)">No stations found.</div>';
          results.querySelectorAll('[data-radio]').forEach((btn) => btn.addEventListener('click', () => {
            audio.src = btn.dataset.radio;
            audio.style.display = 'block';
            audio.play().catch(() => {});
          }));
          return;
        }
        if (mode === 'youtube') {
          const src = q.includes('youtube.com') || q.includes('youtu.be')
            ? q
            : `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
          yt.style.height = '240px';
          yt.src = src.startsWith('http') && (src.includes('watch?v=') || src.includes('youtu.be'))
            ? src.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/').split('&')[0]
            : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q)}`;
          results.innerHTML = '<div style="font-size:11px;color:var(--muted)">YouTube player loaded.</div>';
          return;
        }
        const songs = await searchArchiveSongs(q);
        results.innerHTML = songs.length ? songs.map((song) => `
          <button type="button" data-song="${song.stream}" data-page="${song.page}" style="text-align:left;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:var(--text);padding:8px 10px;border-radius:8px;cursor:pointer">
            <div style="font-size:12px;font-weight:900">${song.title}</div>
            <div style="font-size:10px;color:var(--muted)">${song.creator || 'Internet Archive'} · click to play</div>
          </button>
        `).join('') : '<div style="font-size:11px;color:var(--muted)">No songs found.</div>';
        results.querySelectorAll('[data-song]').forEach((btn) => btn.addEventListener('click', () => {
          audio.src = btn.dataset.song;
          audio.style.display = 'block';
          audio.play().catch(() => {});
        }));
      } catch (error) {
        results.innerHTML = `<div style="font-size:11px;color:var(--danger)">${escapeHtml(error?.message || 'Search failed.')}</div>`;
      }
    }

    panel.querySelector('#cm-music-search')?.addEventListener('click', doSearch);
    panel.querySelector('#cm-music-playurl')?.addEventListener('click', () => {
      const q = query.value.trim();
      if (!q) return;
      if (mode === 'youtube') {
        yt.style.height = '240px';
        yt.src = q.includes('embed/') ? q : q.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/').split('&')[0];
      } else {
        audio.src = q;
        audio.style.display = 'block';
        audio.play().catch(() => {});
      }
    });
    panel.querySelector('#cm-music-close')?.addEventListener('click', () => panel.remove());
    doSearch();
  }

  function showWebSearchAgent() {
    const old = document.getElementById('cm-web-search-agent');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'cm-web-search-agent';
    panel.className = 'cm-glass';
    panel.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:18px',
      'width:min(420px,calc(100vw - 36px))',
      'height:360px',
      'resize:both',
      'overflow:hidden',
      'z-index:100005',
      'border:1px solid rgba(96,165,250,.35)',
      'border-radius:14px',
      'background:rgba(17,17,24,.98)',
      'box-shadow:0 18px 60px rgba(0,0,0,.55)',
      "font-family:'JetBrains Mono',monospace",
      'color:#e8e8f0'
    ].join(';');
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;cursor:move;border-bottom:1px solid rgba(255,255,255,.08)">
        <div>
          <div style="font-size:12px;font-weight:900;color:var(--accent3)">Web Search Agent</div>
          <div style="font-size:10px;color:var(--muted)">DuckDuckGo and Wikipedia results, free and quick.</div>
        </div>
        <button type="button" class="cm-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Close</button>
      </div>
      <div style="padding:10px 12px;display:grid;gap:8px;height:calc(100% - 46px);overflow:auto">
        <input id="cm-web-query" placeholder="Search the web..." style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px">
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" data-source="duck" class="cm-web-source">DuckDuckGo</button>
          <button type="button" data-source="wiki" class="cm-web-source">Wikipedia</button>
          <button type="button" data-source="both" class="cm-web-source">Both</button>
        </div>
        <div id="cm-web-results" style="display:grid;gap:8px"></div>
      </div>`;
    document.body.appendChild(panel);
    const sourceButtons = panel.querySelectorAll('.cm-web-source');
    let source = 'both';
    const results = panel.querySelector('#cm-web-results');
    const query = panel.querySelector('#cm-web-query');
    const render = (items) => {
      results.innerHTML = items.length ? items.map((item) => `
        <a href="${item.url}" target="_blank" style="text-decoration:none;color:inherit;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);padding:8px 10px;border-radius:8px">
          <div style="font-size:12px;font-weight:900">${escapeHtml(item.title)}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:3px">${escapeHtml(item.snippet || '')}</div>
        </a>
      `).join('') : '<div style="color:var(--muted);font-size:11px">No results yet.</div>';
    };
    const search = async () => {
      const q = query.value.trim();
      if (!q) { results.innerHTML = '<div style="color:var(--muted);font-size:11px">Type a search query.</div>'; return; }
      results.innerHTML = '<div style="color:var(--muted);font-size:11px">Searching...</div>';
      try {
        const items = [];
        if (source === 'duck' || source === 'both') items.push(...await webSearchDuckDuckGo(q));
        if (source === 'wiki' || source === 'both') items.push(...await webSearchWikipedia(q));
        render(items);
      } catch (error) {
        results.innerHTML = `<div style="color:var(--danger);font-size:11px">${escapeHtml(error?.message || 'Search failed.')}</div>`;
      }
    };
    sourceButtons.forEach((btn) => btn.addEventListener('click', () => {
      source = btn.dataset.source;
      sourceButtons.forEach((b) => b.style.opacity = b.dataset.source === source ? '1' : '.7');
      search();
    }));
    panel.querySelector('.cm-close')?.addEventListener('click', () => panel.remove());
    query.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
    panel.querySelector('#cm-web-results')?.addEventListener('click', () => {});
    sourceButtons.forEach((b) => b.style.opacity = b.dataset.source === source ? '1' : '.7');
    search();
  }

  function showChatAgent() {
    const old = document.getElementById('cm-chat-agent');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'cm-chat-agent';
    panel.className = 'cm-glass';
    panel.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:392px',
      'width:min(420px,calc(100vw - 36px))',
      'height:360px',
      'resize:both',
      'overflow:hidden',
      'z-index:100005',
      'border:1px solid rgba(168,85,247,.35)',
      'border-radius:14px',
      'background:rgba(17,17,24,.98)',
      'box-shadow:0 18px 60px rgba(0,0,0,.55)',
      "font-family:'JetBrains Mono',monospace",
      'color:#e8e8f0'
    ].join(';');
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08)">
        <div>
          <div style="font-size:12px;font-weight:900;color:var(--accent3)">Chat Agent</div>
          <div style="font-size:10px;color:var(--muted)">Use the main assistant or a custom free endpoint later.</div>
        </div>
        <button type="button" class="cm-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Close</button>
      </div>
      <div style="padding:10px 12px;display:grid;gap:8px;height:calc(100% - 46px);overflow:auto">
        <textarea id="cm-chat-input" placeholder="Ask a question..." rows="5" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px;resize:vertical"></textarea>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" id="cm-chat-send" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:8px;padding:8px 10px;cursor:pointer">Send</button>
        </div>
        <div id="cm-chat-output" style="padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.03);min-height:120px;white-space:pre-wrap;overflow:auto"></div>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelector('.cm-close')?.addEventListener('click', () => panel.remove());
    panel.querySelector('#cm-chat-send')?.addEventListener('click', async () => {
      const input = panel.querySelector('#cm-chat-input').value.trim();
      const out = panel.querySelector('#cm-chat-output');
      if (!input) return;
      out.textContent = 'Thinking...';
      try {
        const reply = await chatAgentReply(input);
        out.textContent = typeof reply === 'string' ? reply : JSON.stringify(reply, null, 2);
      } catch (error) {
        out.textContent = error?.message || 'Chat failed.';
      }
    });
  }

  function showPhotosAgent() {
    const old = document.getElementById('cm-photos-agent');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'cm-photos-agent';
    panel.className = 'cm-glass';
    panel.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:392px',
      'width:min(520px,calc(100vw - 36px))',
      'height:380px',
      'resize:both',
      'overflow:hidden',
      'z-index:100005',
      'border:1px solid rgba(14,165,233,.35)',
      'border-radius:14px',
      'background:rgba(17,17,24,.98)',
      'box-shadow:0 18px 60px rgba(0,0,0,.55)',
      "font-family:'JetBrains Mono',monospace",
      'color:#e8e8f0'
    ].join(';');
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08)">
        <div>
          <div style="font-size:12px;font-weight:900;color:var(--accent3)">Photos</div>
          <div style="font-size:10px;color:var(--muted)">Browse and download free images.</div>
        </div>
        <button type="button" class="cm-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Close</button>
      </div>
      <div style="padding:10px 12px;display:grid;gap:8px;height:calc(100% - 46px);overflow:auto">
        <input id="cm-photo-query" placeholder="Search photos..." style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px">
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" id="cm-photo-search" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:8px;padding:8px 10px;cursor:pointer">Search</button>
          <button type="button" id="cm-photo-download-all" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:8px;padding:8px 10px;cursor:pointer">Download all visible</button>
        </div>
        <div id="cm-photo-results" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px"></div>
      </div>`;
    document.body.appendChild(panel);
    const results = panel.querySelector('#cm-photo-results');
    const query = panel.querySelector('#cm-photo-query');
    let current = [];
    const render = (items) => {
      current = items;
      results.innerHTML = items.length ? items.map((img) => `
        <div style="border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:10px;overflow:hidden">
          <img src="${img.thumb || img.url}" alt="${escapeHtml(img.title)}" style="width:100%;height:120px;object-fit:cover;display:block"/>
          <div style="padding:8px">
            <div style="font-size:11px;font-weight:900;line-height:1.3">${escapeHtml(img.title)}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:3px">${escapeHtml(img.author || 'Openverse')}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
              <a href="${img.url}" target="_blank" style="text-decoration:none;border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:5px 7px">Open</a>
              <a href="${img.url}" download style="text-decoration:none;border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:5px 7px">Download</a>
            </div>
          </div>
        </div>
      `).join('') : '<div style="color:var(--muted);font-size:11px">No images loaded yet.</div>';
    };
    const search = async () => {
      const q = query.value.trim();
      if (!q) return;
      results.innerHTML = '<div style="color:var(--muted);font-size:11px">Searching...</div>';
      try {
        render(await openversePhotos(q));
      } catch (error) {
        results.innerHTML = `<div style="color:var(--danger);font-size:11px">${escapeHtml(error?.message || 'Search failed.')}</div>`;
      }
    };
    panel.querySelector('.cm-close')?.addEventListener('click', () => panel.remove());
    panel.querySelector('#cm-photo-search')?.addEventListener('click', search);
    panel.querySelector('#cm-photo-download-all')?.addEventListener('click', () => {
      current.forEach((img) => window.open(img.url, '_blank'));
    });
    query.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
  }

  async function showVideoAgent() {
    const old = document.getElementById('cm-video-agent');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'cm-video-agent';
    panel.className = 'cm-glass';
    panel.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:392px',
      'width:min(520px,calc(100vw - 36px))',
      'height:380px',
      'resize:both',
      'overflow:hidden',
      'z-index:100006',
      'border:1px solid rgba(244,63,94,.35)',
      'border-radius:14px',
      'background:rgba(17,17,24,.98)',
      'box-shadow:0 18px 60px rgba(0,0,0,.55)',
      "font-family:'JetBrains Mono',monospace",
      'color:#e8e8f0'
    ].join(';');
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08)">
        <div>
          <div style="font-size:12px;font-weight:900;color:var(--accent3)">Video Maker</div>
          <div style="font-size:10px;color:var(--muted)">Build a short video from free image APIs locally.</div>
        </div>
        <button type="button" class="cm-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Close</button>
      </div>
      <div style="padding:10px 12px;display:grid;gap:8px;height:calc(100% - 46px);overflow:auto">
        <input id="cm-video-query" placeholder="Video topic..." style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px">
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" id="cm-video-search" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:8px;padding:8px 10px;cursor:pointer">Generate</button>
        </div>
        <div id="cm-video-status" style="font-size:11px;color:var(--muted)">This will make a short WebM from free image results.</div>
        <video id="cm-video-preview" controls style="width:100%;max-height:180px;display:none;border-radius:10px;background:#000"></video>
      </div>`;
    document.body.appendChild(panel);
    const status = () => document.getElementById('cm-video-status');
    const preview = panel.querySelector('#cm-video-preview');
    panel.querySelector('.cm-close')?.addEventListener('click', () => panel.remove());
    panel.querySelector('#cm-video-search')?.addEventListener('click', async () => {
      const q = panel.querySelector('#cm-video-query').value.trim();
      if (!q) return;
      status().textContent = 'Building video...';
      try {
        const { blob } = await buildVideoFromPhotos(q);
        const url = URL.createObjectURL(blob);
        preview.src = url;
        preview.style.display = 'block';
        preview.play().catch(() => {});
        status().textContent = 'Video ready.';
      } catch (error) {
        status().textContent = error?.message || 'Video generation failed.';
      }
    });
  }

  async function supabaseRequest(path, init = {}) {
    if (!supabaseEnabled) return null;
    const headers = { ...SUPABASE_HEADERS, ...(init.headers || {}) };
    if (supabaseSession?.access_token) {
      headers.Authorization = `Bearer ${supabaseSession.access_token}`;
    }
    const res = await fetch(`${supabaseRestUrl}${path}`, { ...init, headers });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    return { ok: res.ok, status: res.status, data };
  }

  function supabaseSessionKey() {
    return 'sb-codemind-session';
  }

  async function supabaseGetSession() {
    if (!supabaseEnabled) return null;
    try {
      const raw = localStorage.getItem(supabaseSessionKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.access_token) {
          supabaseSession = parsed;
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  }

  function persistSupabaseSession(session) {
    supabaseSession = session || null;
    try {
      if (session) localStorage.setItem(supabaseSessionKey(), JSON.stringify(session));
      else localStorage.removeItem(supabaseSessionKey());
    } catch (_) {}
  }

  async function supabaseInitializeAuth() {
    if (!supabaseEnabled || supabaseReady) return;
    supabaseReady = true;
    const saved = await supabaseGetSession();
    supabaseUser = saved?.user || null;
  }

  async function supabaseSignUpOrIn(email, password, mode = 'signin') {
    if (!supabaseEnabled) throw new Error('Supabase is not configured.');
    const endpoint = mode === 'signup' ? '/signup' : '/token?grant_type=password';
    const res = await fetch(`${supabaseAuthUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.msg || data?.error_description || data?.error || 'Failed to authenticate.');
    if (data?.access_token) {
      persistSupabaseSession(data);
      supabaseUser = data.user || null;
    }
    return data;
  }

  async function supabaseSignOut() {
    persistSupabaseSession(null);
    supabaseUser = null;
  }

  async function supabaseList() {
    if (!supabaseEnabled || !supabaseSession?.access_token) return null;
    const res = await supabaseRequest(`/${SUPABASE_TABLE}?select=* &order=created_at.desc`.replace(' ', ''));
    if (!res?.ok) return null;
    return (res.data || []).map(normalizeSupabaseConversation);
  }

  async function supabaseSave(item) {
    if (!supabaseEnabled || !supabaseSession?.access_token) return false;
    const payload = supabasePayload(item);
    const res = await supabaseRequest(`/${SUPABASE_TABLE}`, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(payload)
    });
    return !!res?.ok;
  }

  async function supabaseClear() {
    if (!supabaseEnabled || !supabaseSession?.access_token) return false;
    const rows = await supabaseList();
    if (!rows?.length) return true;
    const ids = rows.map((row) => row.id).filter(Boolean);
    if (!ids.length) return false;
    const res = await supabaseRequest(`/${SUPABASE_TABLE}?id=in.(${ids.map((id) => encodeURIComponent(id)).join(',')})`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' }
    });
    return !!res?.ok;
  }

  function supabasePayload(item) {
    return {
      id: item.id,
      user_id: supabaseUser?.id || supabaseSession?.user?.id || null,
      created_at: new Date(item.createdAt || Date.now()).toISOString(),
      status: item.status || 'unknown',
      mode: item.mode || '',
      language: item.language || '',
      platform: item.platform || '',
      answer_type: item.answerType || '',
      question: item.question || '',
      code_input: item.codeInput || '',
      editor_code: item.editorCode || '',
      response_text: item.responseText || '',
      response_html: item.responseHtml || '',
      error_message: item.errorMessage || '',
      payload_json: JSON.stringify(item)
    };
  }

  function normalizeSupabaseConversation(row) {
    try {
      if (row.payload_json) return JSON.parse(row.payload_json);
    } catch (_) {}
    return {
      id: row.id,
      createdAt: row.created_at ? Date.parse(row.created_at) || Date.now() : Date.now(),
      status: row.status || 'unknown',
      mode: row.mode || '',
      language: row.language || '',
      platform: row.platform || '',
      answerType: row.answer_type || '',
      question: row.question || '',
      codeInput: row.code_input || '',
      editorCode: row.editor_code || '',
      responseText: row.response_text || '',
      responseHtml: row.response_html || '',
      errorMessage: row.error_message || ''
    };
  }

  function val(id) {
    return document.getElementById(id)?.value || '';
  }

  function text(id) {
    return document.getElementById(id)?.innerText || '';
  }

  function appVar(name, fallback) {
    try {
      const value = Function(`return typeof ${name} !== "undefined" ? ${name} : undefined`)();
      return value === undefined ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function snapshotPrompt() {
    return {
      question: val('questionInput').trim(),
      codeInput: val('codeInput').trim(),
      editorCode: val('codeEditor').trim(),
      language: appVar('currentLang', 'javascript'),
      mode: appVar('currentMode', 'solve'),
      platform: appVar('currentPlatform', 'general'),
      answerType: appVar('selectedAnswerType', 'optimal')
    };
  }

  async function saveConversation(before, status, errorMessage) {
    if (!localDbEnabled && !supabaseEnabled) return;
    const responseText = text('responsePanel').trim();
    const hasContent = before.question || before.codeInput || before.editorCode || responseText || errorMessage;
    if (!hasContent) return;

    const item = {
      id: `cm_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      status,
      errorMessage: errorMessage || '',
      responseText,
      responseHtml: document.getElementById('responsePanel')?.innerHTML || '',
      ...before
    };

    const savedToSupabase = await supabaseSave(item).catch(() => false);
    const savedToSqlite = savedToSupabase ? true : await sqliteSave(item);
    if (!savedToSupabase && !savedToSqlite) {
      await dbWrite(CONVERSATIONS, 'readwrite', store => store.put(item)).catch(() => null);
    }
    renderDbBadge();
  }

  function debounce(fn, wait) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  function saveDraft() {
    const draft = snapshotPrompt();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || Date.now() - draft.savedAt > 1000 * 60 * 60 * 24 * 7) return;
      if (document.getElementById('questionInput') && !val('questionInput')) document.getElementById('questionInput').value = draft.question || '';
      if (document.getElementById('codeInput') && !val('codeInput')) document.getElementById('codeInput').value = draft.codeInput || '';
      if (document.getElementById('codeEditor') && !val('codeEditor')) document.getElementById('codeEditor').value = draft.editorCode || '';
    } catch (_) {}
  }

  function installAskWrapper() {
    if (typeof window.askAI !== 'function' || window.askAI.__cmWrapped) return;
    const original = window.askAI;
    window.askAI = async function wrappedAskAI(...args) {
      const before = snapshotPrompt();
      try {
        const result = await original.apply(this, args);
        await saveConversation(before, 'success', '');
        return result;
      } catch (error) {
        await saveConversation(before, 'error', error?.message || String(error));
        throw error;
      }
    };
    window.askAI.__cmWrapped = true;
  }

  function installSmoothness() {
    document.documentElement.style.scrollBehavior = 'smooth';
    document.addEventListener('input', debounce(saveDraft, 450), true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveDraft();
    });

    const lazyWork = () => {
      document.querySelectorAll('textarea, input').forEach(el => {
        el.setAttribute('spellcheck', el.id === 'questionInput' ? 'true' : 'false');
      });
    };

    if ('requestIdleCallback' in window) requestIdleCallback(lazyWork, { timeout: 1500 });
    else setTimeout(lazyWork, 250);
  }

  function showStreamlitNotice() {
    if (!isCloudStreamlit || localStorage.getItem('cm_streamlit_notice_closed') === '1') return;
    const notice = document.createElement('div');
    notice.id = 'cm-streamlit-notice';
    notice.className = 'cm-glass';
    notice.style.cssText = [
      'position:fixed',
      'left:18px',
      'right:18px',
      'bottom:18px',
      'z-index:100000',
      'border:1px solid rgba(0,229,255,.35)',
      'border-radius:10px',
      'background:rgba(17,17,24,.96)',
      'box-shadow:0 18px 60px rgba(0,0,0,.5)',
      'padding:14px',
      'display:flex',
      'gap:12px',
      'align-items:flex-start',
      'justify-content:space-between',
      'color:var(--text)',
      "font-family:'Syne',sans-serif"
    ].join(';');

    notice.innerHTML = `<div style="max-width:900px">
      <div style="font-size:14px;font-weight:900;color:var(--accent);margin-bottom:4px">Streamlit Cloud mode</div>
      <div style="font-size:12px;line-height:1.55;color:var(--muted)">
        You are viewing CodeMind on Streamlit Cloud, so the local conversation database is disabled here and this deployment will not save your chats permanently.
        To save every conversation on your laptop, run the project locally. Read the setup guide here:
        <a href="README.md" target="_blank" style="color:var(--accent);font-weight:800">README.md</a>.
        Process: download/clone the project, run <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">pip install -r requirements.txt</code>,
        then run <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">streamlit run streamlit_app.py</code>.
      </div>
    </div>
    <button type="button" id="cm-streamlit-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:7px;padding:7px 10px;cursor:pointer;flex:none">Close</button>`;

    document.body.appendChild(notice);
    document.getElementById('cm-streamlit-close')?.addEventListener('click', () => {
      localStorage.setItem('cm_streamlit_notice_closed', '1');
      notice.remove();
    });
  }

  function showDatabaseUnavailableNotice() {
    const old = document.getElementById('cm-db-unavailable-notice');
    if (old) old.remove();

    const notice = document.createElement('div');
    notice.id = 'cm-db-unavailable-notice';
    notice.className = 'cm-glass';
    notice.style.cssText = [
      'position:fixed',
      'left:18px',
      'right:18px',
      'bottom:18px',
      'z-index:100000',
      'border:1px solid rgba(245,158,11,.42)',
      'border-radius:10px',
      'background:rgba(17,17,24,.96)',
      'box-shadow:0 18px 60px rgba(0,0,0,.5)',
      'padding:14px',
      'display:flex',
      'gap:12px',
      'align-items:flex-start',
      'justify-content:space-between',
      'color:var(--text)',
      "font-family:'Syne',sans-serif"
    ].join(';');

    notice.innerHTML = `<div style="max-width:900px">
      <div style="font-size:14px;font-weight:900;color:var(--warn);margin-bottom:4px">Local database unavailable</div>
      <div style="font-size:12px;line-height:1.55;color:var(--muted)">
        Conversation saving is available only when CodeMind is running locally on your own laptop, such as
        <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">localhost</code> or
        <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">127.0.0.1</code>.
        On Streamlit Cloud, chats are not saved permanently for privacy and deployment safety.
        See <a href="README.md" target="_blank" style="color:var(--accent);font-weight:800">README.md</a> for the local setup process.
      </div>
    </div>
    <button type="button" id="cm-db-unavailable-close" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:7px;padding:7px 10px;cursor:pointer;flex:none">Close</button>`;

    document.body.appendChild(notice);
    document.getElementById('cm-db-unavailable-close')?.addEventListener('click', () => notice.remove());
    setTimeout(() => notice.remove(), 12000);
  }

  async function renderDbBadge() {
    if (!localDbEnabled && !supabaseEnabled) return;
    const rows = (await supabaseList()) || (await sqliteList()) || (await dbReadAll().catch(() => []));
    const count = rows.length;
    let badge = document.getElementById('cm-local-db-badge');
    if (!badge) {
      badge = document.createElement('button');
      badge.id = 'cm-local-db-badge';
      badge.type = 'button';
      badge.className = 'cm-neon-hover';
      badge.style.cssText = [
        'position:fixed',
        'right:18px',
        'bottom:188px',
        'z-index:99998',
        'border:1px solid rgba(16,185,129,.45)',
        'background:rgba(17,17,24,.92)',
        'color:#e8e8f0',
        'border-radius:8px',
        'padding:8px 12px',
        "font-family:'JetBrains Mono',monospace",
        'font-size:11px',
        'font-weight:800',
        'cursor:pointer',
        'box-shadow:0 10px 30px rgba(0,0,0,.35)'
      ].join(';');
      badge.onclick = showDbPanel;
      document.body.appendChild(badge);
    }
    badge.textContent = supabaseEnabled && supabaseSession?.access_token
      ? `Supabase DB ${count}`
      : `${sqliteAvailable ? 'SQLite DB' : 'Local DB'} ${count}`;
    badge.title = isLocalHost
      ? sqliteAvailable
        ? 'SQLite database is saving conversations on this laptop'
        : 'Browser database is saving conversations on this local browser'
      : supabaseEnabled && supabaseSession?.access_token
        ? `Signed into Supabase as ${supabaseUser?.email || 'unknown user'}`
      : isStreamlit
        ? 'Local Streamlit run: conversations are saved in this browser database'
        : 'IndexedDB is active for this browser profile';
  }

  async function showDbPanel() {
    if (!localDbEnabled && !supabaseEnabled) {
      showDatabaseUnavailableNotice();
      return;
    }
    const old = document.getElementById('cm-local-db-panel');
    if (old) { old.remove(); return; }
    const rows = (await supabaseList()) || (await sqliteList()) || (await dbReadAll().catch(() => []));
    const panel = document.createElement('div');
    panel.id = 'cm-local-db-panel';
    panel.className = 'cm-glass';
    panel.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:236px',
      'width:min(460px,calc(100vw - 36px))',
      'max-height:58vh',
      'overflow:auto',
      'z-index:99999',
      'border:1px solid rgba(16,185,129,.35)',
      'border-radius:10px',
      'background:rgba(17,17,24,.96)',
      'box-shadow:0 18px 60px rgba(0,0,0,.5)',
      "font-family:'JetBrains Mono',monospace",
      'color:#e8e8f0'
    ].join(';');

    panel.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px">
      <div>
        <div style="font-size:12px;font-weight:900;color:var(--accent3)">${supabaseEnabled && supabaseSession?.access_token ? 'Supabase Conversation Database' : 'Local Conversation Database'}</div>
        <div style="font-size:10px;color:var(--muted);line-height:1.5">${supabaseEnabled && supabaseSession?.access_token ? `Signed in as ${supabaseUser?.email || 'a Supabase user'}.` : sqliteAvailable ? 'Saving to local SQLite on this laptop.' : 'Saving to this local browser database.'}</div>
      </div>
      <div style="display:flex;gap:6px">
        ${supabaseEnabled ? `<button type="button" id="cm-db-auth" style="border:1px solid rgba(59,130,246,.4);background:rgba(59,130,246,.12);color:#bfdbfe;border-radius:6px;padding:6px 8px;cursor:pointer">${supabaseSession?.access_token ? 'Sign out' : 'Sign in'}</button>` : ''}
        <button type="button" id="cm-db-export" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Export</button>
        <button type="button" id="cm-db-clear" style="border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.12);color:#fca5a5;border-radius:6px;padding:6px 8px;cursor:pointer">Clear</button>
        <button type="button" onclick="document.getElementById('cm-local-db-panel')?.remove()" style="border:1px solid var(--border);background:var(--bg3);color:var(--muted);border-radius:6px;padding:6px 8px;cursor:pointer">Close</button>
      </div>
    </div>
    <div id="cm-db-rows">${rows.length ? rows.map(renderConversationRow).join('') : '<div style="padding:18px;color:var(--muted);font-size:11px;text-align:center;border-top:1px solid rgba(255,255,255,.06)">No conversations saved yet. Ask CodeMind once and it will appear here.</div>'}</div>`;

    document.body.appendChild(panel);
    document.getElementById('cm-db-auth')?.addEventListener('click', async () => {
      if (supabaseSession?.access_token) {
        await supabaseSignOut();
      } else {
        const email = prompt('Enter your Supabase email:');
        if (!email) return;
        const password = prompt('Enter your Supabase password:');
        if (!password) return;
        try {
          const nextMode = confirm('Press OK to sign up, or Cancel to sign in with the password you already created.');
          await supabaseSignUpOrIn(email.trim(), password, nextMode ? 'signup' : 'signin');
          alert('Supabase sign-in complete.');
        } catch (error) {
          alert(error?.message || 'Could not start Supabase sign-in.');
        }
      }
      document.getElementById('cm-local-db-panel')?.remove();
      renderDbBadge();
    });
    document.getElementById('cm-db-export')?.addEventListener('click', () => exportDb(rows));
    document.getElementById('cm-db-clear')?.addEventListener('click', clearDb);
    document.getElementById('cm-db-rows')?.addEventListener('click', event => {
      const row = event.target.closest('[data-cm-conv]');
      if (!row) return;
      const item = rows.find(entry => entry.id === row.dataset.cmConv);
      if (item) restoreConversation(item);
    });
  }

  function renderConversationRow(item) {
    const title = (item.question || item.codeInput || item.editorCode || 'Untitled conversation').slice(0, 90);
    const date = new Date(item.createdAt).toLocaleString();
    const color = item.status === 'success' ? 'var(--accent3)' : 'var(--danger)';
    return `<button type="button" data-cm-conv="${item.id}" style="display:block;width:100%;text-align:left;background:transparent;border:0;border-top:1px solid rgba(255,255,255,.06);padding:10px 12px;cursor:pointer;color:var(--text)">
      <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:4px">
        <span style="font-size:11px;font-weight:900;color:${color};text-transform:uppercase">${item.status}</span>
        <span style="font-size:10px;color:var(--muted)">${date}</span>
      </div>
      <div style="font-size:12px;font-weight:800;line-height:1.35">${escapeHtml(title)}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:3px">${escapeHtml(item.mode)} · ${escapeHtml(item.language)} · ${escapeHtml(item.platform)}</div>
    </button>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function exportDb(rows) {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codemind-conversations-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function clearDb() {
    if (!confirm('Clear all locally saved CodeMind conversations from this browser?')) return;
    const clearedSupabase = await supabaseClear().catch(() => false);
    const clearedSqlite = clearedSupabase ? true : await sqliteClear();
    if (!clearedSupabase && !clearedSqlite) {
      await dbWrite(CONVERSATIONS, 'readwrite', store => store.clear()).catch(() => null);
    }
    document.getElementById('cm-local-db-panel')?.remove();
    renderDbBadge();
  }

  function restoreConversation(item) {
    const question = document.getElementById('questionInput');
    const codeInput = document.getElementById('codeInput');
    const editor = document.getElementById('codeEditor');
    const panel = document.getElementById('responsePanel');
    if (question) question.value = item.question || '';
    if (codeInput) codeInput.value = item.codeInput || '';
    if (editor) editor.value = item.editorCode || item.codeInput || '';
    if (panel) panel.innerHTML = item.responseHtml || `<div class="ai-msg"><div class="ai-content"><pre>${escapeHtml(item.responseText || '')}</pre></div></div>`;
    if (typeof switchTab === 'function') switchTab('response');
    document.getElementById('cm-local-db-panel')?.remove();
  }

  function init() {
    installSmoothness();
    restoreDraft();
    installAskWrapper();
    setTimeout(installAskWrapper, 700);
    showStreamlitNotice();
    supabaseInitializeAuth().finally(() => checkSqlite().finally(renderDbBadge));
    if (!localStorage.getItem(CONNECTOR_SKIP_KEY)) {
      setTimeout(showAgentsGateway, 500);
    }
  }

  window.CodeMindSite = {
    localDbEnabled,
    supabaseEnabled,
    sqliteAvailable: () => sqliteAvailable,
    isLocalHost,
    signInWithSupabase: supabaseSignUpOrIn,
    signOutSupabase: supabaseSignOut,
    showAgentsGateway,
    showEmailAgent,
    showMusicPlayer,
    showWebSearchAgent,
    showChatAgent,
    showPhotosAgent,
    showVideoAgent,
    saveConversation,
    listConversations: dbReadAll,
    restoreConversation,
    showDbPanel,
    showDatabaseUnavailableNotice
  };

  ready(init);
})();
