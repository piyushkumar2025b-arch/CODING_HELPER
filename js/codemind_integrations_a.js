// ============================================================
// AI IMAGE GENERATION — Pollinations.ai (free, no key)
// ============================================================
let imgStyle = 'photorealistic';
let imgSize = '512x512';
let lastGenImgUrl = '';

function setImgOpt(el, varName, val) {
  if (varName === 'imgStyle') imgStyle = val;
  if (varName === 'imgSize') imgSize = val;
  el.closest('.options-row').querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

async function generateImage() {
  const prompt = document.getElementById('imgPromptInput').value.trim();
  if (!prompt) { alert('Enter a prompt!'); return; }
  const btn = document.getElementById('genImgBtn');
  btn.disabled = true; btn.textContent = '⏳ Generating...';
  const out = document.getElementById('imgOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:30px;font-size:13px;">🎨 Creating your image... (5-15 sec)</div>';
  const [w, h] = imgSize.split('x');
  const fullPrompt = `${prompt}, ${imgStyle}`;
  const encoded = encodeURIComponent(fullPrompt);
  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
  lastGenImgUrl = url;
  out.innerHTML = `<div class="gen-img-result">
    <img src="${url}" alt="${prompt}" onload="document.getElementById('saveImgVaultBtn').style.display='';document.getElementById('genImgBtn').disabled=false;document.getElementById('genImgBtn').textContent='🖼️ Generate Image';" onerror="document.getElementById('imgOutput').innerHTML='<div style=color:var(--danger);padding:20px;text-align:center>❌ Generation failed. Try a simpler prompt or try again.</div>';document.getElementById('genImgBtn').disabled=false;document.getElementById('genImgBtn').textContent='🖼️ Generate Image';"/>
    <div class="gen-img-meta">Prompt: ${fullPrompt.substring(0,80)}... · ${w}×${h}px · Seed: ${seed}</div>
    <div style="display:flex;gap:8px;">
      <a href="${url}" download="codemind_image_${seed}.png" target="_blank" class="btn btn-secondary" style="font-size:11px;padding:6px 12px;text-decoration:none;">⬇️ Download</a>
      <button class="btn btn-secondary" onclick="copyToClipboard('${url}')" style="font-size:11px;padding:6px 12px;">📋 Copy URL</button>
    </div>
  </div>`;
}

async function enhanceImgPrompt() {
  if (!apiKey) { openModal('apiModal'); return; }
  const prompt = document.getElementById('imgPromptInput').value.trim();
  if (!prompt) { alert('Enter a prompt to enhance!'); return; }
  const result = await callGemini(
    `You are an expert at writing image generation prompts. Return ONLY the enhanced prompt, nothing else.`,
    `Enhance this image generation prompt to be more detailed and vivid for a ${imgStyle} style image. Keep it under 200 characters.\n\nOriginal: ${prompt}`
  );
  if (result?.text) document.getElementById('imgPromptInput').value = result.text.trim().replace(/^["']|["']$/g,'');
}

async function saveImgToVault() {
  if (!lastGenImgUrl) return;
  const prompt = document.getElementById('imgPromptInput').value.trim().substring(0,40);
  const name = `ai-image-${Date.now()}.png`;
  try {
    const res = await fetch(lastGenImgUrl);
    const blob = await res.blob();
    await vaultSaveBlob(name, blob, 'image/png', `AI: ${prompt}`);
    alert('✅ Image saved to File Vault!');
  } catch(e) { alert('Could not save image. Try downloading instead.'); }
}

// ============================================================
// TRANSLATOR — MyMemory API (free)
// ============================================================
async function translateText() {
  const text = document.getElementById('translateInput').value.trim();
  if (!text) { alert('Enter text to translate!'); return; }
  const from = document.getElementById('translateFrom').value;
  const to = document.getElementById('translateTo').value;
  const out = document.getElementById('translateOutput');
  const meta = document.getElementById('translateMeta');
  out.textContent = '🌍 Translating...';
  out.style.color = 'var(--muted)';
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
    const data = await res.json();
    if (data.responseStatus === 200) {
      out.textContent = data.responseData.translatedText;
      out.style.color = 'var(--text)';
      const quality = data.responseData.match ? Math.round(data.responseData.match * 100) : '?';
      meta.textContent = `Confidence: ${quality}% · Powered by MyMemory API`;
    } else {
      out.textContent = '❌ Translation failed. Try again.';
      out.style.color = 'var(--danger)';
    }
  } catch(e) {
    out.textContent = '❌ Network error. Check connection.';
    out.style.color = 'var(--danger)';
  }
}

function swapLangs() {
  const f = document.getElementById('translateFrom');
  const t = document.getElementById('translateTo');
  const tmp = f.value;
  f.value = t.value;
  t.value = tmp;
  const inTxt = document.getElementById('translateInput').value;
  const outTxt = document.getElementById('translateOutput').textContent;
  if (outTxt && outTxt !== 'Translation will appear here...' && !outTxt.startsWith('❌') && !outTxt.startsWith('🌍')) {
    document.getElementById('translateInput').value = outTxt;
    document.getElementById('translateOutput').textContent = inTxt;
  }
}

async function translateCodeComments() {
  if (!apiKey) { openModal('apiModal'); return; }
  const code = document.getElementById('codeCommentInput').value.trim();
  if (!code) { alert('Paste some code first!'); return; }
  const to = document.getElementById('translateTo');
  const toLang = to.options[to.selectedIndex].text.replace(/[^a-zA-Z ]/g,'').trim();
  const result = await callGemini(
    `You are a code translator. Return ONLY the translated code, no explanation.`,
    `Translate only the code comments and string literals in this code to ${toLang}. Keep all code logic, variable names, and syntax exactly the same. Return ONLY the translated code.\n\n${code}`
  );
  if (result?.text) {
    const outBox = document.getElementById('codeCommentOutput');
    outBox.textContent = result.text.replace(/^```[\w]*\n?|\n?```$/g,'').trim();
    outBox.style.display = '';
  }
}

// ============================================================
// WEATHER — Open-Meteo + Geocoding (both free, no key)
// ============================================================
const WMO_CODES = {
  0:'☀️ Clear sky',1:'🌤️ Mainly clear',2:'⛅ Partly cloudy',3:'☁️ Overcast',
  45:'🌫️ Foggy',48:'🌫️ Icy fog',51:'🌦️ Light drizzle',53:'🌦️ Drizzle',55:'🌧️ Heavy drizzle',
  61:'🌧️ Slight rain',63:'🌧️ Rain',65:'🌧️ Heavy rain',71:'🌨️ Slight snow',73:'🌨️ Snow',75:'🌨️ Heavy snow',
  80:'🌦️ Showers',81:'🌧️ Heavy showers',82:'⛈️ Violent showers',95:'⛈️ Thunderstorm',99:'⛈️ Hail storm'
};
function wmoIcon(code) { const e = WMO_CODES[code]||'🌡️ Unknown'; return e.split(' ')[0]; }
function wmoDesc(code) { return (WMO_CODES[code]||'Unknown').replace(/^\S+\s/,''); }

async function fetchWeather() {
  const city = document.getElementById('weatherCityInput').value.trim();
  if (!city) { alert('Enter a city name!'); return; }
  const out = document.getElementById('weatherOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">🔍 Searching...</div>';
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geo = await geoRes.json();
    if (!geo.results?.length) { out.innerHTML = '<div style="color:var(--danger);text-align:center;padding:20px">❌ City not found. Try another name.</div>'; return; }
    const loc = geo.results[0];
    await renderWeather(loc.latitude, loc.longitude, `${loc.name}, ${loc.country}`);
  } catch(e) { out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ ${e.message}</div>`; }
}

async function fetchMyLocation() {
  if (!navigator.geolocation) { alert('Geolocation not supported!'); return; }
  const out = document.getElementById('weatherOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">📍 Getting location...</div>';
  navigator.geolocation.getCurrentPosition(async pos => {
    await renderWeather(pos.coords.latitude, pos.coords.longitude, 'Your Location');
  }, () => { out.innerHTML = '<div style="color:var(--danger);text-align:center;padding:20px">❌ Location access denied.</div>'; });
}

async function renderWeather(lat, lon, label) {
  const out = document.getElementById('weatherOutput');
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weathercode,precipitation&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    const d = await res.json();
    const cur = d.current;
    const daily = d.daily;
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const forecastHTML = daily.time.slice(0,7).map((t,i) => {
      const date = new Date(t);
      return `<div class="forecast-day">
        <div class="forecast-day-name">${i===0?'Today':days[date.getDay()]}</div>
        <div class="forecast-day-icon">${wmoIcon(daily.weathercode[i])}</div>
        <div class="forecast-day-temp">${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</div>
      </div>`;
    }).join('');
    out.innerHTML = `<div class="weather-card">
      <div class="weather-main">
        <div class="weather-icon">${wmoIcon(cur.weathercode)}</div>
        <div>
          <div class="weather-temp">${Math.round(cur.temperature_2m)}°C</div>
          <div class="weather-city">${label}</div>
          <div class="weather-desc">${wmoDesc(cur.weathercode)} · Feels like ${Math.round(cur.apparent_temperature)}°C</div>
        </div>
      </div>
      <div class="weather-grid">
        <div class="weather-stat"><div class="weather-stat-label">Humidity</div><div class="weather-stat-val">${cur.relative_humidity_2m}%</div></div>
        <div class="weather-stat"><div class="weather-stat-label">Wind</div><div class="weather-stat-val">${cur.wind_speed_10m} km/h</div></div>
        <div class="weather-stat"><div class="weather-stat-label">Precipitation</div><div class="weather-stat-val">${cur.precipitation} mm</div></div>
        <div class="weather-stat"><div class="weather-stat-label">Lat / Lon</div><div class="weather-stat-val" style="font-size:11px;">${lat.toFixed(2)}, ${lon.toFixed(2)}</div></div>
      </div>
      <div style="margin-top:12px"><div class="input-label" style="margin-bottom:7px">7-Day Forecast</div>
        <div class="weather-forecast">${forecastHTML}</div>
      </div>
    </div>`;
  } catch(e) { out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ Weather fetch failed: ${e.message}</div>`; }
}

// ============================================================
// HACKERNEWS — Official API (free, no key)
// ============================================================
let newsType = 'top';
function setNewsType(t, el) {
  newsType = t;
  document.querySelectorAll('#panel-news .opt-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  loadNews();
}

async function loadNews() {
  const out = document.getElementById('newsOutput');
  out.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;">📰 Loading stories...</div>';
  try {
    const res = await fetch(`https://hacker-news.firebaseio.com/v0/${newsType}stories.json`);
    const ids = await res.json();
    const top20 = ids.slice(0,20);
    const stories = await Promise.all(top20.map(id =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
    ));
    out.innerHTML = stories.filter(s=>s&&s.title).map(s => {
      const domain = s.url ? (() => { try { return new URL(s.url).hostname.replace('www.',''); } catch{ return ''; } })() : 'news.ycombinator.com';
      const time = new Date(s.time*1000).toLocaleDateString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      const link = s.url || `https://news.ycombinator.com/item?id=${s.id}`;
      return `<div class="news-card">
        <div class="news-card-title"><a href="${link}" target="_blank">${s.title}</a></div>
        <div class="news-card-meta">
          <span class="news-score">▲ ${s.score||0}</span>
          <span class="news-meta-item">💬 ${s.descendants||0} comments</span>
          <span class="news-meta-item">🌐 ${domain}</span>
          <span class="news-meta-item">🕐 ${time}</span>
          <a href="https://news.ycombinator.com/item?id=${s.id}" target="_blank" style="font-size:10px;color:var(--accent);margin-left:auto;font-family:'JetBrains Mono',monospace;">HN →</a>
        </div>
      </div>`;
    }).join('');
  } catch(e) { out.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">❌ ${e.message}</div>`; }
}

