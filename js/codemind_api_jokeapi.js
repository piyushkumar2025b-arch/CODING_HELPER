(function () {
  window.CM_API_EXTRA_TESTS = window.CM_API_EXTRA_TESTS || [];
  window.CM_API_EXTRA_TESTS.push({
    id: 'joke_api',
    label: 'JokeAPI',
    group: 'Free',
    needsKey: false,
    async test() {
      const res = await fetch('https://v2.jokeapi.dev/joke/Programming?safe-mode');
      if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
      const d = await res.json();
      if (d.error) return { ok: false, msg: d.message || 'Joke API error' };
      return { ok: true, msg: `✓ ${d.type} joke loaded (${d.category})` };
    },
    keyHint: 'No key required. Handy for fun features and loading-state demos.',
  });
})();
