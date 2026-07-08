(function () {
  window.CM_API_EXTRA_TESTS = window.CM_API_EXTRA_TESTS || [];
  window.CM_API_EXTRA_TESTS.push({
    id: 'open_exchange',
    label: 'Exchange Rates',
    group: 'Free',
    needsKey: false,
    async test() {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
      const d = await res.json();
      const inr = d?.rates?.INR;
      return { ok: d.result === 'success' && !!inr, msg: inr ? `✓ USD → INR ${Number(inr).toFixed(2)}` : 'No INR rate' };
    },
    keyHint: 'No key required. Live exchange rates from open.er-api.com.',
  });
})();
