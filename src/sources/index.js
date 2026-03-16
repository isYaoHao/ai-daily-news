import { fetchRSS } from './rss.js';
import { fetchHTML } from './html.js';
import { loadSources } from '../config.js';
import { getLogger } from '../logger.js';

/**
 * Fetch all articles from all configured sources.
 * @param {object} opts - { maxAge, lang }
 * @returns {Promise<Array>} all articles, deduped and sorted
 */
export async function fetchAllSources(opts = {}) {
  const log = getLogger();
  const sources = loadSources();
  const maxAge = parseMaxAge(opts.maxAge || '24h');

  const fetchers = [];

  for (const src of sources.rss || []) {
    if (opts.lang && opts.lang !== 'all' && src.lang !== opts.lang) continue;
    fetchers.push(fetchRSS(src, { maxAge }));
  }

  for (const src of sources.html || []) {
    if (opts.lang && opts.lang !== 'all' && src.lang !== opts.lang) continue;
    fetchers.push(fetchHTML(src, { maxAge }));
  }

  const results = await Promise.allSettled(fetchers);
  const allArticles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Dedupe by title similarity
  const seen = new Set();
  const deduped = allArticles.filter(a => {
    const key = a.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '').slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date descending
  deduped.sort((a, b) => b.pubDate - a.pubDate);

  log.info(`Total articles fetched: ${allArticles.length}, after dedup: ${deduped.length}`);
  return deduped;
}

function parseMaxAge(str) {
  const match = str.match(/^(\d+)(h|d|m)$/);
  if (!match) return 24 * 60 * 60 * 1000;
  const val = parseInt(match[1]);
  switch (match[2]) {
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    case 'm': return val * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}
