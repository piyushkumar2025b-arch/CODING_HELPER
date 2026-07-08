(function () {
  window.CM_API_EXTRA_TESTS = window.CM_API_EXTRA_TESTS || [];
  window.CM_API_EXTRA_TESTS.push({
    id: 'github_public',
    label: 'GitHub Public API',
    group: 'Free',
    needsKey: false,
    async test() {
      const res = await fetch('https://api.github.com/repos/openai/openai-cookbook', {
        headers: { Accept: 'application/vnd.github+json' }
      });
      if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
      const d = await res.json();
      return { ok: !!d.full_name, msg: `✓ ${d.full_name} · ⭐ ${d.stargazers_count?.toLocaleString?.() || d.stargazers_count || 0}` };
    },
    keyHint: 'No key required for public repository lookups, but rate limits are lower without auth.',
  });
})();
