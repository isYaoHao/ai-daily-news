/**
 * Gemini CLI-based digest generator.
 * Calls `gemini` CLI in one-shot mode — no API key needed.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, readFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLogger } from '../logger.js';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = resolve(__dirname, '../../.tmp');

const SYSTEM_PROMPTS = {
  en: `AI news editor. Input: today's articles (JSON, fields: t=title, s=summary snippet, src=source, l=link, c=category). Output: curated digest as STRICT JSON (no fences).
Schema: {"title":"AI Daily Digest","subtitle":"one-line theme","date":"YYYY-MM-DD","lang":"en","items":[{"title":"rewritten headline","summary":"2-3 complete sentences on what happened and why it matters","source":"source name","link":"url","category":"research|industry|news|community"}]}
Rules: pick top ITEM_LIMIT most impactful items, diverse topics, deduplicate same stories. Write clear headlines. Each summary MUST be 2-3 COMPLETE sentences with specific details — never use generic filler like "significant development". If input snippet is short, infer context from the title. JSON only.`,

  zh: `AI新闻编辑。输入：今日文章(JSON, 字段: t=标题, s=摘要片段, src=来源, l=链接, c=分类)。输出：精选日报，严格JSON（无代码块）。
Schema: {"title":"AI 日报","subtitle":"一句话主题","date":"YYYY-MM-DD","lang":"zh","items":[{"title":"重写标题","summary":"2-3句完整摘要，说明事件和影响","source":"来源","link":"链接","category":"research|industry|news|community"}]}
规则：选最重要的ITEM_LIMIT条，去重，不标题党。每条摘要必须是2-3句完整句子，包含具体细节，禁止空泛套话。只返回JSON。`,
};

/**
 * Generate a digest by calling `gemini` CLI.
 */
export async function generateGeminiDigest(articles, lang, opts = {}) {
  const log = getLogger();
  const date = opts.date || new Date().toISOString().slice(0, 10);
  const maxItems = opts.maxItems || 15;
  const model = opts.model || 'gemini-2.5-flash';

  // Prepare input: trimmed article list (keep compact)
  const input = articles.slice(0, 25).map(a => ({
    t: a.title,
    s: (a.summary || '').slice(0, 100),
    src: a.source,
    l: a.link,
    c: a.category,
  }));

  const systemPrompt = (SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.en)
    .replace(/ITEM_LIMIT/g, String(maxItems));

  const userPrompt = `Date: ${date}\n\nArticles:\n${JSON.stringify(input, null, 2)}`;
  const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  // Write prompt to temp file, pipe to gemini via shell
  mkdirSync(TMP_DIR, { recursive: true });
  const inputFile = resolve(TMP_DIR, `prompt-${lang}.txt`);

  writeFileSync(inputFile, fullPrompt, 'utf-8');

  log.info(`Calling Gemini CLI (model: ${model}) for ${lang} digest via file IO...`);

  try {
    // Use shell to pipe file content to gemini stdin
    const { stdout } = await execFileAsync('sh', [
      '-c',
      `cat "${inputFile}" | gemini --model ${model} --output-format json`,
    ], {
      timeout: 180_000,
      maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env },
    });

    // Gemini CLI with --output-format json wraps in { response: "...", ... }
    let jsonStr;
    try {
      const wrapper = JSON.parse(stdout.trim());
      jsonStr = wrapper.response || stdout.trim();
    } catch {
      jsonStr = stdout.trim();
    }

    // Strip markdown code fences if present
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    const result = JSON.parse(jsonStr);

    // Validate and normalize
    const items = (result.items || []).slice(0, maxItems).map(item => ({
      title: item.title || '',
      summary: item.summary || '',
      source: item.source || '',
      link: item.link || '',
      category: item.category || 'news',
    }));

    // Build markdown
    const lines = [];
    lines.push(`# ${result.title || 'AI Daily Digest'} — ${date}`);
    lines.push(`> ${result.subtitle || ''}\n`);

    const grouped = {};
    for (const item of items) {
      const cat = item.category || 'news';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    const catLabels = lang === 'zh'
      ? { research: '研究', industry: '行业', news: '新闻', community: '社区' }
      : { research: 'Research', industry: 'Industry', news: 'News', community: 'Community' };

    for (const [cat, catItems] of Object.entries(grouped)) {
      lines.push(`## ${catLabels[cat] || cat}\n`);
      for (const item of catItems) {
        lines.push(`### ${item.title}`);
        if (item.summary) lines.push(item.summary);
        lines.push(`🔗 [${item.source}](${item.link})\n`);
      }
    }

    log.info(`Gemini digest generated: ${items.length} items for ${lang}`);

    return {
      title: result.title || (lang === 'zh' ? 'AI 日报' : 'AI Daily Digest'),
      subtitle: result.subtitle || '',
      date,
      lang,
      items,
      markdown: lines.join('\n'),
    };
  } catch (err) {
    log.error(`Gemini CLI failed: ${err.message}`);
    throw err;
  } finally {
    try { unlinkSync(inputFile); } catch {}
  }
}
