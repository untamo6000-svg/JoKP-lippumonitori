const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 8080;
const JOKP_LIPPU_URL = 'https://www.lippu.fi/artist/joensuun-kiekko-pojat/';

let matchesCache = [];
let lastFetchTime = 'Ei vielä haettu';

async function fetchJoKPMatches() {
  try {
    const response = await axios.get(JOKP_LIPPU_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fi-FI,fi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const matches = [];

    $('.event-list-item, .event-card, [data-event-id], article').each((i, el) => {
      const title = $(el).find('.event-list-item-title, .event-card-title, h3, h2').text().trim();
      const date = $(el).find('.event-list-item-date, .event-card-date, time').text().trim();
      const link = $(el).find('a').attr('href');

      if (title) {
        matches.push({
          id: link ? link.split('-').pop().replace('/', '') : i,
          title: title,
          date: date || 'Katso päivämäärä Lippu.fi',
          url: link ? (link.startsWith('http') ? link : `https://www.lippu.fi${link}`) : JOKP_LIPPU_URL,
          status: 'Lippuja saatavilla'
        });
      }
    });

    if (matches.length > 0) {
      matchesCache = matches;
    } else {
      matchesCache = [{
        id: 'jokp-default',
        title: 'JoKP Kotiottelut & Liput',
        date: 'Seuraavat ottelut saatavilla',
        url: JOKP_LIPPU_URL,
        status: 'Osta liput Lippu.fi-palvelusta'
      }];
    }

    lastFetchTime = new Date().toLocaleTimeString('fi-FI');
    return matchesCache;
  } catch (error) {
    console.error('Virhe haettaessa otteluita:', error.message);
    
    matchesCache = [{
      id: 'jokp-direct',
      title: 'Joensuun Kiekko-Pojat - Otteluliput',
      date: 'Lippu.fi virallinen myynti',
      url: JOKP_LIPPU_URL,
      status: 'Aktiivinen myynti (Siirry Lippu.fi)'
    }];
    lastFetchTime = new Date().toLocaleTimeString('fi-FI');
    return matchesCache;
  }
}

app.get('/', async (req, res) => {
  const matches = await fetchJoKPMatches();
  
  let html = `
    <!DOCTYPE html>
    <html lang="fi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Joensuun Kiekko-Pojat - Lippumonitori</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f9; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #d9534f; text-align: center; }
        .match-card { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 6px; background: #fafafa; }
        .btn { display: inline-block; background: #d9534f; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px; }
        .btn:hover { background: #c9302c; }
        .info { text-align: center; font-size: 0.9em; color: #666; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Joensuun Kiekko-Pojat Lippumonitori</h1>
        <div class="info">Viimeisin päivitys: ${lastFetchTime}</div>
  `;

  matches.forEach(match => {
    html += `
      <div class="match-card">
        <h3>${match.title}</h3>
        <p><strong>Ajankohta:</strong> ${match.date}</p>
        <p><strong>Tila:</strong> ${match.status}</p>
        <a href="${match.url}" target="_blank" class="btn">Osta liput / Siirry Lippu.fi</a>
      </div>
    `;
  });

  html += `
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Lippumonitori käynnissä portissa ${PORT}`);
});
