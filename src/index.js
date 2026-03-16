/**
 * Main pipeline: fetch → digest → image → output
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dayjs from 'dayjs';
import { fetchAllSources } from './sources/index.js';
import { generateDigest } from './llm/index.js';
import { generateShareImage } from './image/generate.js';
import { loadConfig } from './config.js';
import { getLogger } from './logger.js';

/**
 * Run the full pipeline.
 * @param {object} opts - { lang: 'all'|'en'|'zh', quiet: boolean }
 */
export async function run(opts = {}) {
  const config = loadConfig();
  const log = getLogger(opts);
  const date = dayjs().format(config.output.dateFormat || 'YYYY-MM-DD');
  config.date = date;

  const languages = opts.lang === 'all'
    ? (config.digest.languages || ['en', 'zh'])
    : [opts.lang || 'en'];

  log.info(`AI Daily News — ${date}`);
  log.info(`Languages: ${languages.join(', ')}, Provider: ${config.llm.provider}`);

  // 1. Fetch articles
  const allArticles = await fetchAllSources({
    maxAge: config.digest.maxAge || '24h',
    lang: languages.length === 1 ? languages[0] : 'all',
  });

  if (allArticles.length === 0) {
    log.warn('No articles fetched from any source');
  }

  const results = [];

  for (const lang of languages) {
    // Filter by language
    const langArticles = allArticles.filter(a => a.lang === lang);
    log.info(`[${lang}] ${langArticles.length} articles`);

    // 2. Generate digest
    const digest = await generateDigest(langArticles, lang, config);

    // 3. Write output
    const outDir = resolve(config.root, config.output.dir, date);
    mkdirSync(outDir, { recursive: true });

    const mdPath = resolve(outDir, `digest-${lang}.md`);
    writeFileSync(mdPath, digest.markdown, 'utf-8');
    log.info(`[${lang}] Digest written: ${mdPath}`);

    const jsonPath = resolve(outDir, `digest-${lang}.json`);
    writeFileSync(jsonPath, JSON.stringify(digest, null, 2), 'utf-8');

    // 4. Generate share image
    const imgPath = resolve(outDir, `share-${lang}.png`);
    try {
      await generateShareImage(digest, config.image, imgPath);
    } catch (err) {
      log.warn(`[${lang}] Image generation failed: ${err.message}`);
    }

    results.push({ lang, mdPath, imgPath, articleCount: langArticles.length });
  }

  log.info('Done!');
  return results;
}
