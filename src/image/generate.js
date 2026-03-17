/**
 * Generate share images: HTML template → Puppeteer screenshot.
 * Background image composited via CSS.
 */
import puppeteer from 'puppeteer';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { getLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BG_IMAGE_PATH = resolve(__dirname, '../../assets/bg-cover.png');

const THEMES = {
  en: { badge: 'AI DAILY', tagline: 'Artificial Intelligence News Digest' },
  zh: { badge: 'AI 日报', tagline: '人工智能新闻精选' },
};

/**
 * Generate a share image for a digest via HTML + Puppeteer screenshot.
 * @param {object} digest - { title, date, items, lang }
 * @param {object} imageConfig - { width, height, ... }
 * @param {string} outputPath
 */
export async function generateShareImage(digest, imageConfig, outputPath) {
  const log = getLogger();
  const {
    width = 1200,
    height = 1600,
    accentColor = '#00d4ff',
  } = imageConfig;

  const theme = THEMES[digest.lang] || THEMES.en;
  const items = digest.items?.slice(0, 10) || [];
  const date = digest.date || new Date().toISOString().slice(0, 10);

  // Encode bg image as base64 data URI for the HTML
  const bgBase64 = readFileSync(BG_IMAGE_PATH).toString('base64');
  const bgDataUri = `data:image/png;base64,${bgBase64}`;

  const html = buildHTML({
    width,
    height,
    accentColor,
    theme,
    items,
    date,
    lang: digest.lang,
    bgDataUri,
  });

  // Launch headless browser, screenshot the page
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Auto-detect actual content height
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    const finalHeight = Math.max(height, bodyHeight);
    await page.setViewport({ width, height: finalHeight, deviceScaleFactor: 2 });

    await page.screenshot({ path: outputPath, type: 'png', clip: { x: 0, y: 0, width, height: finalHeight } });
    log.info(`Share image generated: ${outputPath}`);
  } finally {
    await browser.close();
  }
}

function esc(str) {
  // First decode any HTML entities in the source text, then re-escape for safe HTML
  const decoded = (str || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&hellip;/g, '\u2026');
  // Re-escape for HTML output
  return decoded
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHTML({ width, height, accentColor, theme, items, date, lang, bgDataUri }) {
  const countLabel = lang === 'zh' ? `${items.length} 条新闻` : `${items.length} stories`;

  const itemsHTML = items.map((item) => {
    const title = esc(item.title || '');
    const summary = esc(item.summary || '');
    const source = esc(item.source || '');
    // Filter junk summaries
    const isJunk = /^[\s]*[点击查看原文>›»→…]*[\s]*$/.test(item.summary || '') || (item.summary || '').length < 10;
    const showSummary = !isJunk && summary;

    return `
      <div class="item">
        <div class="item-bar"></div>
        <div class="item-content">
          <div class="item-title">${title}</div>
          ${showSummary ? `<div class="item-summary">${summary}</div>` : ''}
          <div class="item-source">${source}</div>
        </div>
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: ${width}px;
    min-height: ${height}px;
    font-family: -apple-system, "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif;
    color: #e0e0e0;
    background: #0a0a0a;
    overflow: hidden;
  }

  .bg {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: url('${bgDataUri}') center/cover no-repeat;
    z-index: 0;
  }

  .overlay {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(10, 10, 10, 0.6);
    z-index: 1;
  }

  .content {
    position: relative;
    z-index: 2;
    padding: 80px 80px 60px;
  }

  .accent-line {
    width: 120px;
    height: 3px;
    background: ${accentColor};
    border-radius: 2px;
    margin-bottom: 24px;
  }

  .badge {
    font-size: 56px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #f0f0f0;
    line-height: 1.2;
  }

  .tagline {
    font-size: 18px;
    color: #888;
    letter-spacing: 1px;
    margin-top: 8px;
  }

  .date {
    font-family: "SF Mono", "Fira Code", "Menlo", monospace;
    font-size: 28px;
    color: ${accentColor};
    opacity: 0.85;
    margin-top: 24px;
  }

  .count-badge {
    display: inline-block;
    background: rgba(0, 212, 255, 0.12);
    color: ${accentColor};
    font-size: 15px;
    padding: 6px 16px;
    border-radius: 16px;
    margin-top: 16px;
  }

  .separator {
    height: 1px;
    background: rgba(136, 136, 136, 0.3);
    margin: 28px 0;
  }

  .items {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .item {
    display: flex;
    gap: 16px;
    align-items: stretch;
  }

  .item-bar {
    width: 4px;
    min-height: 100%;
    background: ${accentColor};
    opacity: 0.5;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .item-content {
    flex: 1;
    min-width: 0;
    padding: 4px 0;
  }

  .item-title {
    font-size: 22px;
    font-weight: 600;
    color: #f0f0f0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .item-summary {
    font-size: 15px;
    color: #999;
    line-height: 1.6;
    margin-top: 6px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .item-source {
    font-size: 13px;
    color: ${accentColor};
    opacity: 0.7;
    margin-top: 6px;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid rgba(136, 136, 136, 0.3);
    font-family: "SF Mono", "Fira Code", "Menlo", monospace;
    font-size: 13px;
    color: #666;
  }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="overlay"></div>
  <div class="content">
    <div class="accent-line"></div>
    <div class="badge">${esc(theme.badge)}</div>
    <div class="tagline">${esc(theme.tagline)}</div>
    <div class="date">${esc(date)}</div>
    <div class="count-badge">${esc(countLabel)}</div>
    <div class="separator"></div>
    <div class="items">
      ${itemsHTML}
    </div>
    <div class="footer">
      <span>Generated by AI Daily News</span>
      <span>${esc(date)}</span>
    </div>
  </div>
</body>
</html>`;
}
