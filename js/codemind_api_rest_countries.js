(function () {
  window.CM_API_EXTRA_TESTS = window.CM_API_EXTRA_TESTS || [];
  window.CM_API_EXTRA_TESTS.push({
    id: 'rest_countries',
    label: 'REST Countries',
    group: 'Free',
    needsKey: false,
    async test() {
      const res = await fetch('https://restcountries.com/v3.1/name/India?fullText=true');
      if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
      const d = await res.json();
      const country = d?.[0];
      return { ok: !!country, msg: country ? `✓ ${country.name.common} · capital ${country.capital?.[0] || 'N/A'}` : 'No country found' };
    },
    keyHint: 'No key required. Uses live country data from REST Countries.',
  });
})();
