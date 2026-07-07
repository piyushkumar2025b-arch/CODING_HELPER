// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); askAI(); }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') { e.preventDefault(); runCode(); }
  if (e.key === 'Escape') {
    ['apiModal','judge0Modal','gistModal'].forEach(id => {
      if (!document.getElementById(id).classList.contains('hidden')) closeModal(id);
    });
  }
});

// Tab key in editor
document.getElementById('codeEditor').addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = e.target.selectionStart;
    e.target.value = e.target.value.substring(0, s) + '  ' + e.target.value.substring(e.target.selectionEnd);
    e.target.selectionStart = e.target.selectionEnd = s + 2;
  }
});

// Auto-preview for HTML on typing
document.getElementById('codeEditor').addEventListener('input', () => {
  if (currentLang === 'html' && previewOpen) renderPreview();
});

