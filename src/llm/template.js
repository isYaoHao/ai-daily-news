/**
 * Template-based digest generator (no LLM required).
 * Produces a structured digest from raw articles using simple heuristics.
 */

const LABELS = {
  en: {
    title: 'AI Daily Digest',
    subtitle: 'Your daily roundup of AI news',
    categories: { research: 'Research', industry: 'Industry', news: 'News', community: 'Community' },
    noNews: 'No significant AI news today.',
  },
  zh: {
    title: 'AI 日报',
    subtitle: '每日 AI 新闻精选',
    categories: { research: '研究', industry: '行业', news: '新闻', community: '社区' },
    noNews: '今日暂无重要 AI 新闻。',
  },
};

/**
 * Generate a digest using templates (no LLM).
 * @param {Array} articles - Filtered articles for this language
 * @param {string} lang - 'en' or 'zh'
 * @param {object} opts - { maxItems, date }
 * @returns {{ title, subtitle, date, items, markdown, lang }}
 */
export function generateTemplateDigest(articles, lang, opts = {}) {
  const l = LABELS[lang] || LABELS.en;
  const maxItems = opts.maxItems || 15;
  const date = opts.date || new Date().toISOString().slice(0, 10);

  const top = articles.slice(0, maxItems);

  // Group by category
  const grouped = {};
  for (const a of top) {
    const cat = a.category || 'news';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  }

  // Build markdown
  const lines = [];
  lines.push(`# ${l.title} — ${date}`);
  lines.push(`> ${l.subtitle}\n`);

  if (top.length === 0) {
    lines.push(l.noNews);
  } else {
    for (const [cat, items] of Object.entries(grouped)) {
      const catLabel = l.categories[cat] || cat;
      lines.push(`## ${catLabel}\n`);
      for (const item of items) {
        lines.push(`### ${item.title}`);
        if (item.summary) {
          lines.push(item.summary.replace(/\n/g, ' ').slice(0, 200));
        }
        lines.push(`🔗 [${item.source}](${item.link})\n`);
      }
    }
  }

  const items = top.map(a => ({
    title: a.title,
    summary: a.summary?.slice(0, 150) || '',
    source: a.source,
    link: a.link,
    category: a.category,
  }));

  return {
    title: l.title,
    subtitle: l.subtitle,
    date,
    lang,
    items,
    markdown: lines.join('\n'),
  };
}
