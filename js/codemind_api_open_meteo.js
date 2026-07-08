(function () {
  window.CM_API_EXTRA_TESTS = window.CM_API_EXTRA_TESTS || [];
  window.CM_API_EXTRA_TESTS.push({
    id: 'open_meteo',
    label: 'Open-Meteo Weather',
    group: 'Free',
    needsKey: false,
    async test() {
      const geo = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=London&count=1&language=en&format=json');
      if (!geo.ok) return { ok: false, msg: `Geo HTTP ${geo.status}` };
      const g = await geo.json();
      const loc = g.results?.[0];
      if (!loc) return { ok: false, msg: 'No geocoding results' };
      const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`);
      if (!wx.ok) return { ok: false, msg: `Weather HTTP ${wx.status}` };
      const d = await wx.json();
      const temp = d.current_weather?.temperature;
      return { ok: temp !== undefined, msg: temp !== undefined ? `✓ London ${temp}°C` : 'No temperature data' };
    },
    keyHint: 'No key required. Official free weather API with no signup.',
  });
})();
