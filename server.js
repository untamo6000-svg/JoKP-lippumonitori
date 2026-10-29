const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 8080;

const JOKP_LIPPU_URL = 'https://www.lippu.fi/artist/jokp/';

let matchesCache = [];
let lastFetchTime = null;

async function fetchJoKPMatches() {
  try {
    const response = await axios.get(JOKP_LIPPU_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const matches = [];

    $('.event-list-item, .event-card, [data-event-id]').each((i, el) => {
      const title = $(el).find('.event-list-item-title, .event-card-title, h3').text().trim();
      const date = $(el).find('.event-list-item-date, .event-card-date, time').text().trim();
      const link = $(el).find('a').attr('href');

      if (title && (title.includes('JoKP') || title.includes('Kiekko-Pojat') || title.includes('Joensuu'))) {
        matches.push({
          id: link ? link.split('-').pop().replace('/', '') : i,
          title: title || 'JoKP Kotiottelu',
          date: date || 'Päivämäärä tarkentuu',
          url: link ? (link.startsWith('http') ? link : `https://www.lippu.fi${link}`) : JOKP_LIPPU_URL,
          status: 'Lippuja saatavilla (Lippu.fi)'
        });
      }
    });

    if (matches.length === 0) {
      matches.push({
        id: 'jokp-seuraava',
        title: 'JoKP Kotiottelu',
        date: 'Seuraava kotiottelu',
        url: JOKP_LIPPU_URL,
        status: 'Aktiivinen myynti Lippu.fi-palvelussa'
      });
    }

    matchesCache = matches;
    lastFetchTime = new Date().toLocaleTimeString('fi-FI');
    return matches;
  } catch (error) {
    console.error('Virhe haettaessa otteluita:', error.message);
    return matchesCache;
  }
}

setInterval(fetchJoKPMatches, 60000);
fetchJoKPMatches();

app.get('/api/matches', (req, res) => {
  res.json({
    updatedAt: lastFetchTime,
    team: 'Joensuun Kiekko-Pojat',
    matches: matchesCache
  });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>JoKP Lippumonitori</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 20px; }
        h1 { font-size: 1.5rem; color: #ef4444; display: flex; align-items: center; gap: 10px; }
        .live-tag { background: #22c55e; color: #000; font-size: 0.75rem; font-weight: bold; padding: 3px 8px; border-radius: 12px; text-transform: uppercase; }
        .card { background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 15px; border-left: 4px solid #ef4444; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); }
        .title { font-size: 1.2rem; font-weight: bold; margin-bottom: 5px; }
        .date { color: #94a3b8; font-size: 0.9rem; margin-bottom: 15px; }
        .status { background: #0f172a; padding: 10px; border-radius: 6px; color: #38bdf8; font-weight: 600; display: inline-block; font-size: 0.9rem; }
        .btn { display: inline-block; float: right; background: #ef4444; color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; }
        footer { margin-top: 30px; text-align: center; font-size: 0.8rem; color: #64748b; }
      </style>
      <script>
        async function loadData() {
          try {
            const res = await fetch('/api/matches');
            const data = await res.json();
            document.getElementById('updated').innerText = 'Päivitetty: ' + (data.updatedAt || 'Hetki sitten');
            const html = data.matches.map(m => \`
              <div class="card">
                <a href="\${m.url}" target="_blank" class="btn">Osta liput ↗</a>
                <div class="title">\${m.title}</div>
                <div class="date">\${m.date}</div>
                <div class="status">🔴 \${m.status}</div>
              </div>
            \`).join('');
            document.getElementById('content').innerHTML = html;
          } catch(e) {}
        }
        setInterval(loadData, 15000);
        window.onload = loadData;
      </script>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>🔴 JoKP Lippumonitori <span class="live-tag">Live</span></h1>
          <span id="updated" style="font-size: 0.85rem; color: #94a3b8;">Päivitetään...</span>
        </header>
        <div id="content">Ladataan otteluita...</div>
        <footer>Automaattinen lippumonitori Joensuun Kiekko-Pojille</footer>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT,'0.0.0.0', () => {
  console.log(`Lippumonitori käynnissä portissa ${PORT}`);
});
