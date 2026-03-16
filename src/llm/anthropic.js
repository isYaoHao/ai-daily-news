/**
 * Anthropic Claude-based digest generator.
 * Requires ANTHROPIC_API_KEY env var or config.
 */
import { getLogger } from '../logger.js';

const SYSTEM_PROMPTS = {
  en: `You are an expert AI news editor. Given a list of today's AI news articles, produce a concise, well-organized daily digest in English. Group by theme, write brief summaries, and highlight the most significant developments. Output in Markdown format with clear headings.`,
  zh: `你是一位资深 AI 新闻编辑。根据提供的今日 AI 新闻列表，生成一份简洁、条理清晰的中文日报。按主题分组，撰写简要摘要，并突出最重要的进展。以 Markdown 格式输出，使用清晰的标题。`,
};

export async function generateAnthropicDigest(articles, lang, opts = {}) {
  const log = getLogger();
  const apiKey = opts.apiKey;
  const model = opts.model || 'claude-sonnet-4-20250514';

  if (!apiKey) throw new Error('Anthropic API key not configured');

  const date = opts.date || new Date().toISOString().slice(0, 10);
  const articleList = articles.slice(0, opts.maxItems || 15).map((a, i) =>
    `${i + 1}. [${a.source}] ${a.title}\n   ${a.summary?.slice(0, 200) || ''}\n   URL: ${a.link}`
  ).join('\n\n');

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.en,
      messages: [
        { role: 'user', content: `Date: ${date}\n\nArticles:\n${articleList}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Anthropic API error: ${resp.status} ${err}`);
  }

  const data = await resp.json();
  const markdown = data.content?.[0]?.text || '';

  log.info(`Anthropic digest generated for ${lang} (${markdown.length} chars)`);

  return {
    title: lang === 'zh' ? 'AI 日报' : 'AI Daily Digest',
    subtitle: date,
    date,
    lang,
    items: articles.slice(0, opts.maxItems || 15).map(a => ({
      title: a.title,
      summary: a.summary?.slice(0, 150) || '',
      source: a.source,
      link: a.link,
      category: a.category,
    })),
    markdown,
  };
}
