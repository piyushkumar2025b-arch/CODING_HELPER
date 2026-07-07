(function CodeMindSafetyHandler() {
  'use strict';

  const INPUT_RULES = [
    { id: 'docsInput', placeholder: 'Example: Array.prototype.map, CSS grid, fetch API', title: 'Enter a web/API/CSS/JS term. Example: CSS grid' },
    { id: 'caniuseInput', placeholder: 'Example: css grid, webp, fetch, service worker', title: 'Use a browser feature name only. Example: css grid' },
    { id: 'countryInput', placeholder: 'Example: India, Japan, United States', title: 'Country names only. Example: India' },
    { id: 'triviaAmount', min: '1', max: '20', step: '1', title: 'Enter a whole number from 1 to 20 only.' },
    { id: 'qrInput', placeholder: 'Example: https://example.com or plain text', title: 'Enter a URL or plain text. Avoid empty input.' },
    { id: 'randomUserCount', min: '1', max: '20', step: '1', title: 'Enter a whole number from 1 to 20 only.' },
    { id: 'currencyAmount', min: '0.01', step: '0.01', placeholder: 'Example: 100', title: 'Enter a positive amount only. Example: 100' },
    { id: 'currencyFrom', pattern: '^[A-Z]{3}$', maxlength: '3', placeholder: 'USD', title: 'Use a 3-letter currency code only. Example: USD' },
    { id: 'currencyTo', pattern: '^[A-Z]{3}$', maxlength: '3', placeholder: 'EUR', title: 'Use a 3-letter currency code only. Example: EUR' },
    { id: 'ghProfileInput', pattern: '^[A-Za-z0-9-]{1,39}$', placeholder: 'Example: torvalds', title: 'GitHub usernames only: letters, numbers, hyphen. Example: torvalds' },
    { id: 'colorHexInput', pattern: '^#?[0-9a-fA-F]{6}$', placeholder: '#00e5ff', title: 'Use HEX color format only. Example: #00e5ff' },
    { id: 'tsInput', placeholder: 'Example: 1720000000, 1720000000000, 2026-07-07', title: 'Use Unix seconds, Unix milliseconds, or a valid date string.' },
    { id: 'jsonInput', placeholder: '{"name":"CodeMind","ok":true}', title: 'Paste valid JSON. Strings and keys must use double quotes.' },
    { id: 'b64Input', placeholder: 'Text to encode, or Base64 to decode', title: 'For decode, paste valid Base64 only.' },
    { id: 'urlInput', placeholder: 'Example: hello world or hello%20world', title: 'Use normal text for encode or percent-encoded text for decode.' },
    { id: 'hashInput', placeholder: 'Example: text to hash', title: 'Enter any text to generate a hash.' },
    { id: 'apiKeyInput', placeholder: 'Gemini API key, usually starts with AIza...', title: 'Paste your Gemini API key only.' },
    { id: 'j0KeyInput', placeholder: 'RapidAPI Judge0 key', title: 'Paste your RapidAPI Judge0 key only.' },
    { id: 'gistTokenInput', placeholder: 'GitHub token, usually starts with ghp_ or github_pat_', title: 'Paste a GitHub token with gist access.' }
  ];

  function explainError(error, context) {
    const raw = String(error?.message || error || 'Unknown error');
    if (/failed to fetch|networkerror|load failed/i.test(raw)) {
      return `${context}: network/CORS problem. Check your internet connection, blocked domain, or browser privacy settings.`;
    }
    if (/timeout/i.test(raw)) return `${context}: request timed out. The service may be slow or unavailable right now.`;
    if (/401|403|unauthori[sz]ed|forbidden|invalid api key|expired/i.test(raw)) {
      return `${context}: authentication failed. Check the key format and whether the key is active.`;
    }
    if (/404|not found/i.test(raw)) return `${context}: no matching result found. Check the spelling or use the expected input format.`;
    if (/429|rate limit/i.test(raw)) return `${context}: rate limit reached. Wait a little and try again.`;
    if (/5\d\d|service unavailable|bad gateway/i.test(raw)) return `${context}: provider server error. Try again later.`;
    return `${context}: ${raw}`;
  }

  async function fetchJson(url, options = {}, context = 'API request') {
    const timeoutMs = options.timeoutMs || 12000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (_) {}
      if (!res.ok) {
        const providerMessage = data?.error?.message || data?.message || data?.status_message || text.slice(0, 160);
        throw new Error(`HTTP ${res.status}${providerMessage ? ` - ${providerMessage}` : ''}`);
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Timeout after 12s');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function numberInRange(id, min, max, fallback) {
    const el = document.getElementById(id);
    const value = Number(el?.value);
    if (Number.isFinite(value) && value >= min && value <= max) return value;
    if (el) {
      el.value = String(fallback);
      el.classList.add('neon-border');
      setTimeout(() => el.classList.remove('neon-border'), 900);
    }
    if (typeof showNotification === 'function') {
      showNotification(`Use ${id}: ${min}-${max} only`, 'warn');
    }
    return fallback;
  }

  function currencyCode(id, fallback) {
    const el = document.getElementById(id);
    const code = (el?.value || fallback).trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(code)) {
      if (el) el.value = code;
      return code;
    }
    if (el) {
      el.value = fallback;
      el.classList.add('neon-border');
      setTimeout(() => el.classList.remove('neon-border'), 900);
    }
    if (typeof showNotification === 'function') {
      showNotification('Currency format: 3 uppercase letters only, like USD or INR', 'warn');
    }
    return fallback;
  }

  function decorateInputs() {
    INPUT_RULES.forEach(rule => {
      const el = document.getElementById(rule.id);
      if (!el) return;
      Object.entries(rule).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) el.setAttribute(key, value);
      });
      if (rule.pattern) {
        el.addEventListener('input', () => {
          const re = new RegExp(rule.pattern);
          el.setAttribute('aria-invalid', el.value && !re.test(el.value) ? 'true' : 'false');
        });
      }
    });
  }

  function init() {
    decorateInputs();
  }

  window.CodeMindSafety = {
    explainError,
    fetchJson,
    numberInRange,
    currencyCode,
    decorateInputs
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
