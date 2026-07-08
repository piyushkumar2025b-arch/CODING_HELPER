(function () {
  window.CM_API_EXTRA_TESTS = window.CM_API_EXTRA_TESTS || [];
  window.CM_API_EXTRA_TESTS.push({
    id: 'nominatim_search',
    label: 'Nominatim Geocoding',
    group: 'Free',
    needsKey: false,
    async test() {
      const res = await fetch('https://nominatim.openstreetmap.org/search?q=New%20York&format=jsonv2&limit=1', {
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
      const d = await res.json();
      const hit = d[0];
      return { ok: !!hit, msg: hit ? `✓ ${hit.display_name.substring(0, 60)}...` : 'No location found' };
    },
    keyHint: 'No key required. Use the public search endpoint with care and respect usage policy.',
  });
})();
