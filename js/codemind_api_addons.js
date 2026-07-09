(function () {
  'use strict';

  const extraDefs = [
    {
      id: 'dictionary_api',
      label: 'Dictionary API',
      group: 'Data',
      needsKey: false,
      keyHint: 'Free word definitions and examples.',
      async ping() {
        const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/hello');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const data = await res.json();
        const definition = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition || '';
        return { ok: !!definition, msg: definition ? '✓ hello found' : 'No definition' };
      },
      async call({ word = 'hello' } = {}) {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }
    },
    {
      id: 'joke_api',
      label: 'JokeAPI',
      group: 'Data',
      needsKey: false,
      keyHint: 'Free joke delivery endpoint.',
      async ping() {
        const res = await fetch('https://v2.jokeapi.dev/joke/Programming?type=single');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const data = await res.json();
        return { ok: !!data?.joke, msg: data?.joke ? '✓ joke ready' : 'No joke' };
      },
      async call({ category = 'Programming' } = {}) {
        const res = await fetch(`https://v2.jokeapi.dev/joke/${encodeURIComponent(category)}?type=single`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }
    },
    {
      id: 'rest_countries',
      label: 'Rest Countries',
      group: 'Geo',
      needsKey: false,
      keyHint: 'Country and region data for UI dashboards.',
      async ping() {
        const res = await fetch('https://restcountries.com/v3.1/name/india?fields=name,capital');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const data = await res.json();
        return { ok: Array.isArray(data) && data.length > 0, msg: data[0]?.name?.common ? `✓ ${data[0].name.common}` : 'No country' };
      },
      async call({ name = 'india' } = {}) {
        const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fields=name,capital,region,population`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }
    },
    {
      id: 'exchange_rates',
      label: 'Exchange Rates',
      group: 'Data',
      needsKey: false,
      keyHint: 'Live currency conversion and rate lookups.',
      async ping() {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
        const data = await res.json();
        return { ok: !!data?.rates?.INR, msg: data?.rates?.INR ? '✓ USD to INR' : 'No rates' };
      },
      async call({ base = 'USD' } = {}) {
        const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }
    }
  ];

  window.CM_API_EXTRA_DEFS = (window.CM_API_EXTRA_DEFS || []).concat(extraDefs);
})();
