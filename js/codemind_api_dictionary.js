(function () {
  window.CM_API_EXTRA_TESTS = window.CM_API_EXTRA_TESTS || [];
  window.CM_API_EXTRA_TESTS.push({
    id: 'dictionary_api',
    label: 'Free Dictionary API',
    group: 'Free',
    needsKey: false,
    async test() {
      const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/hello');
      if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
      const d = await res.json();
      const def = d?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
      return { ok: !!def, msg: def ? `✓ hello = "${def.substring(0, 55)}..."` : 'No definition found' };
    },
    keyHint: 'No key required. Free dictionary endpoint for learning tools and word lookups.',
  });
})();
