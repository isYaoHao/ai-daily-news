import { getLogger } from '../logger.js';

/**
 * Fetch articles from HTML/JSON API sources (e.g. HN Algolia).
 * @param {object} source
 * @param {object} opts
 * @returns {Promise<Array>}
 */
export async function fetchHTML(source, opts = {}) {
  const log = getLogger();
  const maxAge = opts.maxAge || 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - maxAge;

  try {
    log.info(`Fetching HTML/API: ${source.name} (${source.url})`);
    const resp = await fetch(source.url, {
      headers: { 'User-Agent': 'AI-Daily-News/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    if (source.type === 'json-api') {
      return parseJSONAPI(await resp.json(), source, cutoff);
    }

    // Generic HTML scraping via cheerio could go here
    log.warn(`HTML scraping not implemented for ${source.name}, skipping`);
    return [];
  } catch (err) {
    log.warn(`Failed to fetch ${source.name}: ${err.message}`);
    return [];
  }
}

function parseJSONAPI(data, source, cutoff) {
  // Hacker News Algolia API format
  if (data.hits) {
    return data.hits
      .map(hit => ({
        title: hit.title || '',
        link: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        summary: hit.story_text?.slice(0, 300) || '',
        pubDate: new Date(hit.created_at),
        source: source.name,
        lang: source.lang,
        category: source.category,
        score: hit.points || 0,
      }))
      .filter(a => a.title && a.pubDate.getTime() > cutoff)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }
  return [];
}
