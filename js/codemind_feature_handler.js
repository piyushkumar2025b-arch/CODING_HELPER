(function CodeMindFeatureHandler() {
  'use strict';

  const FEATURES = [
    { id: 'ai', label: 'AI Solve', requires: ['apiKey'], probes: ['askAI', 'callGemini'] },
    { id: 'runner', label: 'Code Runner', requires: [], probes: ['runCode'] },
    { id: 'judge0', label: 'Judge0 Runner', requires: ['judge0Key'], probes: ['runViaJudge0'] },
    { id: 'github', label: 'GitHub/Gists', requires: ['ghToken'], probes: ['saveAsGist', 'loadMyGists'] },
    { id: 'docs', label: 'Docs Search', requires: [], probes: ['searchDocs', 'searchMDN'] },
    { id: 'devtools', label: 'Dev Tools', requires: [], probes: ['jsonFormat', 'b64Encode', 'genHash'] },
    { id: 'quiz', label: 'Quiz', requires: [], probes: ['initQuiz', 'checkQuizAnswer'] },
    { id: 'flashcards', label: 'Flashcards', requires: [], probes: ['initFlashcards', 'renderFcCard'] },
    { id: 'roadmap', label: 'Roadmap', requires: [], probes: ['initRoadmap'] },
    { id: 'sql', label: 'SQL Playground', requires: [], probes: ['initDBPlayground', 'runSQL'] },
    { id: 'review', label: 'AI Review', requires: ['apiKey'], probes: ['runAICodeReview', 'reviewCurrentCode'] }
  ];

  const STORE = {
    apiKey: 'cm_gemini_key',
    judge0Key: 'cm_j0_key',
    ghToken: 'cm_gh_token'
  };

  function getGlobal(name) {
    try {
      return Function(`return typeof ${name} !== "undefined" ? ${name} : undefined`)();
    } catch (_) {
      return undefined;
    }
  }

  function setGlobal(name, value) {
    try {
      Function('value', `if (typeof ${name} !== "undefined") { ${name} = value; }`)(value);
    } catch (_) {
      window[name] = value;
    }
  }

  function savedValue(name) {
    return localStorage.getItem(STORE[name]) || '';
  }

  function syncKeys() {
    Object.keys(STORE).forEach(name => {
      const saved = savedValue(name);
      if (saved) setGlobal(name, saved);
    });

    if (typeof updateStatus === 'function') updateStatus();
    if (typeof updateJ0Status === 'function') updateJ0Status();
    if (typeof updateGhStatus === 'function') updateGhStatus();
  }

  function featureState(feature) {
    const available = feature.probes.some(name => typeof getGlobal(name) === 'function');
    const missingKeys = feature.requires.filter(name => !savedValue(name) && !getGlobal(name));
    return {
      id: feature.id,
      label: feature.label,
      available,
      ready: available && missingKeys.length === 0,
      missingKeys
    };
  }

  function auditFeatures() {
    syncKeys();
    const states = FEATURES.map(featureState);
    window.dispatchEvent(new CustomEvent('codemind:features-audited', { detail: states }));
    return states;
  }

  function ensureFeature(id) {
    const feature = FEATURES.find(item => item.id === id);
    if (!feature) return { ready: false, reason: 'Unknown feature' };
    const state = featureState(feature);
    if (state.ready) return state;

    const reason = !state.available
      ? `${feature.label} handler is not loaded`
      : `${feature.label} needs ${state.missingKeys.join(', ')}`;

    if (typeof showNotification === 'function') {
      showNotification(reason, state.available ? 'warn' : 'error');
    }

    return { ...state, reason };
  }

  function initTouchNeon() {
    const selector = '.btn,.tbtn,button,.mode-btn,.opt-btn,.plat-tag,.lang-chip,.docs-source-btn,input,textarea,select';
    document.addEventListener('pointerdown', event => {
      const target = event.target.closest(selector);
      if (!target) return;
      target.classList.add('cm-touch-neon');
    }, { passive: true });

    ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach(type => {
      document.addEventListener(type, event => {
        const target = event.target.closest ? event.target.closest(selector) : null;
        if (target) target.classList.remove('cm-touch-neon');
      }, true);
    });
  }

  function init() {
    syncKeys();
    initTouchNeon();
    setTimeout(auditFeatures, 300);
  }

  window.CodeMindFeatures = {
    list: () => FEATURES.slice(),
    audit: auditFeatures,
    ensure: ensureFeature,
    syncKeys
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
