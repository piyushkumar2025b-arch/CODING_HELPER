(function () {
  window.CM_API_EXTRA_TESTS = window.CM_API_EXTRA_TESTS || [];
  window.CM_API_EXTRA_TESTS.push({
    id: 'open_library',
    label: 'Open Library',
    group: 'Free',
    needsKey: false,
    async test() {
      const res = await fetch('https://openlibrary.org/search.json?q=javascript&limit=1');
      if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
      const d = await res.json();
      const hit = d.docs?.[0];
      return { ok: !!hit, msg: hit ? `✓ ${hit.title} by ${hit.author_name?.[0] || 'Unknown'}` : 'No books found' };
    },
    keyHint: 'No key required. Returns live book search results from Open Library.',
  });
})();
