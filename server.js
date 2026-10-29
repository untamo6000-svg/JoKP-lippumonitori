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
    
    // Jos pyyntö epäonnistuu (esim. 403), näytetään siltä varalta suora toimiva linkki
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
