import RSSParser from 'rss-parser';
import { getLogger } from '../logger.js';

const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'AI-Daily-News/1.0 (RSS Reader)',
  },
});

/**
 * Fetch articles from an RSS feed source.
 * @param {object} source - Source config { name, url, lang, category }
 * @param {object} opts - { maxAge }
 * @returns {Promise<Array>} articles
 */
export async function fetchRSS(source, opts = {}) {
  const log = getLogger();
  const maxAge = opts.maxAge || 24 * 60 * 60 * 1000; // 24h default
  const cutoff = Date.now() - maxAge;

  try {
    log.info(`Fetching RSS: ${source.name} (${source.url})`);
    const feed = await parser.parseURL(source.url);

    const articles = (feed.items || [])
      .map(item => ({
        title: item.title?.trim() || '',
        link: item.link || '',
        summary: item.contentSnippet?.slice(0, 300) || item.content?.slice(0, 300) || '',
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        source: source.name,
        lang: source.lang,
        category: source.category,
      }))
      .filter(a => a.title && a.pubDate.getTime() > cutoff);

    log.info(`  → ${articles.length} articles from ${source.name}`);
    return articles;
  } catch (err) {
    log.warn(`Failed to fetch ${source.name}: ${err.message}`);
    return [];
  }
}
