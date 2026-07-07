// ============================================================
// GITIGNORE GENERATOR — gitignore.io API (free, no key)
// ============================================================
async function fetchGitignore() {
  const input = document.getElementById('gitignoreInput').value.trim();
  if (!input) { alert('Enter at least one technology!'); return; }
  const out = document.getElementById('gitignoreOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">🚫 Generating .gitignore...</div>';
  const techs = input.split(',').map(s=>s.trim()).filter(Boolean);
  try {
    const res = await fetch(`https://www.toptal.com/developers/gitignore/api/${techs.join(',')}`);
    if (!res.ok) throw new Error('gitignore.io API error');
    const text = await res.text();
    out.innerHTML = `<div style="background:var(--card);border:1px solid var(--accent3);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div style="font-size:14px;font-weight:800;color:var(--accent3);">📄 .gitignore</div>
        <div style="display:flex;gap:7px;">
          <span style="font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;">Generated for: ${techs.join(', ')}</span>
          <button onclick="navigator.clipboard.writeText(document.getElementById('gitignoreCode').textContent);this.textContent='✓ Copied!';setTimeout(()=>this.textContent='📋 Copy',1500)" style="padding:4px 12px;border-radius:6px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);color:var(--accent3);font-size:11px;font-weight:700;cursor:pointer;">📋 Copy</button>
        </div>
      </div>
      <pre id="gitignoreCode" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#abb2bf;line-height:1.6;overflow-y:auto;max-height:380px;white-space:pre-wrap;user-select:all;">${escapeHtml(text.trim())}</pre>
      <div style="font-size:11px;color:var(--muted);">Powered by <a href="https://gitignore.io" target="_blank" style="color:var(--accent3);">gitignore.io</a> — ${text.split('\n').length} lines generated</div>
    </div>`;
  } catch(e) {
    // Build a local fallback .gitignore
    const rules = buildLocalGitignore(techs);
    out.innerHTML = `<div style="background:var(--card);border:1px solid var(--warn);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;">
      <div style="font-size:11px;color:var(--warn);">⚠️ API unavailable — generated locally</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:14px;font-weight:800;color:var(--warn);">📄 .gitignore (${techs.join(', ')})</div>
        <button onclick="navigator.clipboard.writeText(document.getElementById('gitignoreCode').textContent);this.textContent='✓ Copied!';setTimeout(()=>this.textContent='📋 Copy',1500)" style="padding:4px 12px;border-radius:6px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);color:var(--warn);font-size:11px;font-weight:700;cursor:pointer;">📋 Copy</button>
      </div>
      <pre id="gitignoreCode" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#abb2bf;line-height:1.6;overflow-y:auto;max-height:380px;white-space:pre-wrap;user-select:all;">${escapeHtml(rules)}</pre>
    </div>`;
  }
}

function buildLocalGitignore(techs) {
  const rules = {
    node: '# Node.js\nnode_modules/\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n.pnpm-debug.log*\n.env\n.env.local\ndist/\nbuild/\n.DS_Store\n*.tgz',
    python: '# Python\n__pycache__/\n*.py[cod]\n*.pyo\n.venv/\nvenv/\nenv/\n*.egg-info/\ndist/\nbuild/\n*.pyc\n.pytest_cache/\n.mypy_cache/\n*.egg\n.eggs/',
    react: '# React\nbuild/\n.env\n.env.local\n.env.production\n*.log',
    java: '# Java\n*.class\n*.jar\n*.war\n*.ear\n*.zip\ntarget/\n.mvn/\nmvnw\nmvnw.cmd',
    gradle: '# Gradle\n.gradle/\nbuild/\n!gradle/wrapper/gradle-wrapper.jar\n*.gradle',
    intellij: '# IntelliJ IDEA\n.idea/\n*.iws\n*.iml\n*.ipr\nout/',
    vscode: '# VS Code\n.vscode/\n!.vscode/settings.json\n!.vscode/tasks.json\n!.vscode/launch.json\n!.vscode/extensions.json',
    rust: '# Rust\ntarget/\nCargo.lock\n*.rs.bk',
    cargo: '# Cargo\ntarget/',
    go: '# Go\n*.exe\n*.exe~\n*.dll\n*.so\n*.dylib\n*.test\n*.out\nvendor/',
    macos: '# macOS\n.DS_Store\n.AppleDouble\n.LSOverride\n._*\n.Spotlight-V100\n.Trashes\nIcon\n*.app',
    windows: '# Windows\nThumbs.db\nehthumbs.db\nDesktop.ini\n$RECYCLE.BIN/\n*.lnk',
    linux: '# Linux\n*~\n.nfs*',
    flutter: '# Flutter\n.dart_tool/\n.flutter-plugins\n.flutter-plugins-dependencies\nbuild/\n*.iml',
    dart: '# Dart\n.dart_tool/\n.packages\nbuild/',
    terraform: '# Terraform\n*.tfstate\n*.tfstate.backup\n.terraform/\n*.tfvars\n*.tfplan',
    aws: '# AWS SAM\n.aws-sam/\nsamconfig.toml',
    jupyter: '# Jupyter\n.ipynb_checkpoints/\n*.ipynb_checkpoints',
    virtualenv: '# Virtualenv\n.venv/\nvenv/\nenv/',
    androidstudio: '# Android Studio\n.idea/\n*.iml\nbuild/\nlocal.properties\n.gradle/',
  };
  const out = ['# .gitignore — generated by CodeMind', ''];
  techs.forEach(t => {
    const key = t.toLowerCase().replace(/[^a-z]/g,'');
    if (rules[key]) out.push(rules[key], '');
    else out.push(`# ${t}\n# Add ${t}-specific ignore rules here`, '');
  });
  return out.join('\n');
}

// ============================================================
// AI CODE REVIEW PRO — Deep analysis with Gemini
// ============================================================
let aicrLang = 'auto';
let aicrFocus = 'all';
