// ============================================================
// FILE VAULT — IndexedDB (permanent local storage)
// ============================================================
const DB_NAME = 'CodeMindVault';
const DB_VER = 1;
const STORE = 'files';
let vaultDB = null;

function openVaultDB() {
  return new Promise((res, rej) => {
    if (vaultDB) { res(vaultDB); return; }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {keyPath:'id'});
        store.createIndex('name','name',{unique:false});
      }
    };
    req.onsuccess = e => { vaultDB = e.target.result; res(vaultDB); };
    req.onerror = e => rej(e.target.error);
  });
}

async function vaultSaveBlob(name, blob, type, desc='') {
  const db = await openVaultDB();
  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  const arrayBuf = await blob.arrayBuffer();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).add({id, name, type, size:blob.size, desc, date:Date.now(), data:arrayBuf});
    tx.oncomplete = () => { renderVault(); res(id); };
    tx.onerror = e => rej(e.target.error);
  });
}

async function vaultGetAll() {
  const db = await openVaultDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE,'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = e => rej(e.target.error);
  });
}

async function vaultDelete(id) {
  const db = await openVaultDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { renderVault(); res(); };
    tx.onerror = e => rej(e.target.error);
  });
}

async function vaultClearAll() {
  const db = await openVaultDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => { renderVault(); res(); };
    tx.onerror = e => rej(e.target.error);
  });
}

function fileIcon(type, name) {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📄';
  if (type.includes('zip')||type.includes('rar')||type.includes('tar')||name.endsWith('.gz')) return '🗜️';
  if (type.includes('json')||name.endsWith('.json')) return '📋';
  if (type.includes('text')||['js','ts','py','html','css','md','txt','csv','xml'].some(e=>name.endsWith('.'+e))) return '📝';
  if (type.includes('spreadsheet')||name.endsWith('.xlsx')||name.endsWith('.csv')) return '📊';
  if (type.includes('word')||name.endsWith('.docx')) return '📝';
  return '📁';
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(2) + ' MB';
}

async function renderVault() {
  const grid = document.getElementById('vaultGrid');
  const statsEl = document.getElementById('vaultStats');
  const q = (document.getElementById('vaultSearch')?.value||'').toLowerCase();
  let files = await vaultGetAll();
  if (q) files = files.filter(f => f.name.toLowerCase().includes(q) || (f.type||'').toLowerCase().includes(q) || (f.desc||'').toLowerCase().includes(q));
  files.sort((a,b) => b.date - a.date);
  const totalSize = files.reduce((s,f)=>s+f.size,0);
  statsEl.textContent = `${files.length} file${files.length!==1?'s':''} · ${fmtSize(totalSize)}`;
  if (!files.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:30px;font-size:13px;">No files yet. Drop or click to upload files above ☝️</div>';
    return;
  }
  grid.innerHTML = '';
  files.forEach(file => {
    const card = document.createElement('div');
    card.className = 'vault-file-card';
    const isImg = file.type.startsWith('image/');
    let thumbHTML = '';
    if (isImg) {
      const blob = new Blob([file.data], {type:file.type});
      const url = URL.createObjectURL(blob);
      thumbHTML = `<img class="vault-img-thumb" src="${url}" alt="${file.name}" onload="URL.revokeObjectURL(this.src)" />`;
    } else {
      thumbHTML = `<div class="vault-file-icon">${fileIcon(file.type||'',file.name)}</div>`;
    }
    card.innerHTML = `${thumbHTML}
      <div class="vault-file-name" title="${file.name}">${file.name}</div>
      <div class="vault-file-size">${fmtSize(file.size)}</div>
      <div class="vault-file-date">${new Date(file.date).toLocaleString()}</div>
      ${file.desc?`<div class="vault-file-date" style="color:var(--accent3)">${file.desc}</div>`:''}
      <div class="vault-file-actions">
        <button class="vault-btn dl" onclick="vaultDownload('${file.id}')">⬇️ Download</button>
        <button class="vault-btn rm" onclick="vaultDeleteConfirm('${file.id}')">🗑</button>
      </div>`;
    grid.appendChild(card);
  });
}

async function vaultDownload(id) {
  const files = await vaultGetAll();
  const file = files.find(f=>f.id===id);
  if (!file) return;
  const blob = new Blob([file.data], {type:file.type||'application/octet-stream'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=file.name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function vaultDeleteConfirm(id) {
  if (confirm('Delete this file from the vault? This cannot be undone.')) vaultDelete(id);
}

function clearVault() {
  if (confirm('Delete ALL files from the vault? This cannot be undone.')) vaultClearAll();
}

function vaultHandleFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;
  let done = 0;
  const progress = document.createElement('div');
  progress.className = 'vault-progress';
  progress.innerHTML = `<div class="vault-progress-inner">
    <div style="font-weight:700;font-size:14px;margin-bottom:4px">📂 Saving to Vault...</div>
    <div id="vaultProgText" style="font-size:12px;color:var(--muted)">0 / ${files.length}</div>
    <div class="vault-prog-bar-wrap"><div class="vault-prog-bar-fill" id="vaultProgFill" style="width:0%"></div></div>
  </div>`;
  document.body.appendChild(progress);
  const next = async (i) => {
    if (i >= files.length) { document.body.removeChild(progress); renderVault(); return; }
    const f = files[i];
    await vaultSaveBlob(f.name, f, f.type||'application/octet-stream');
    done++;
    document.getElementById('vaultProgText').textContent = `${done} / ${files.length}`;
    document.getElementById('vaultProgFill').style.width = `${(done/files.length)*100}%`;
    setTimeout(()=>next(i+1), 10);
  };
  next(0);
}

function vaultDragOver(e) { e.preventDefault(); document.getElementById('vaultDropZone').classList.add('drag-over'); }
function vaultDragLeave(e) { document.getElementById('vaultDropZone').classList.remove('drag-over'); }
function vaultDrop(e) {
  e.preventDefault();
  document.getElementById('vaultDropZone').classList.remove('drag-over');
  if (e.dataTransfer.files.length) vaultHandleFiles(e.dataTransfer.files);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(()=>{}).catch(()=>{});
}

