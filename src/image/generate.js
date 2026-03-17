/**
 * Generate minimalist tech-style share images using Sharp (SVG → PNG).
 * Uses a background cover image composited with SVG text overlay.
 */
import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BG_IMAGE_PATH = resolve(__dirname, '../../assets/bg-cover.png');

const THEMES = {
  en: { badge: 'AI DAILY', tagline: 'Artificial Intelligence News Digest' },
  zh: { badge: 'AI 日报', tagline: '人工智能新闻精选' },
};

/**
 * Generate a minimalist tech-style share image for a digest.
 * @param {object} digest - { title, date, items, lang }
 * @param {object} imageConfig - { width, height, backgroundColor, accentColor, textColor }
 * @param {string} outputPath
 */
export async function generateShareImage(digest, imageConfig, outputPath) {
  const log = getLogger();
  const {
    width = 1200,
    height = 1600,
    backgroundColor = '#0a0a0a',
    accentColor = '#00d4ff',
    textColor = '#e0e0e0',
    secondaryColor = '#888888',
  } = imageConfig;

  const theme = THEMES[digest.lang] || THEMES.en;
  const items = digest.items?.slice(0, 10) || [];
  const date = digest.date || new Date().toISOString().slice(0, 10);

  // Build SVG — each item: title + 2 lines of summary + source
  const maxSummaryChars = 55; // chars per summary line
  const itemsSVG = items.map((item, i) => {
    const y = 420 + i * 110;
    const title = escapeXml(truncate(item.title, 45));
    const source = escapeXml(item.source || '');

    // Split summary into 2 lines (skip junk like "点击查看原文")
    const rawSummary = item.summary || '';
    const isJunk = /^[\s]*[点击查看原文>›»→…]*[\s]*$/.test(rawSummary) || rawSummary.length < 10;
    const fullSummary = isJunk ? '' : rawSummary;
    const line1 = fullSummary ? escapeXml(truncateAtWord(fullSummary, maxSummaryChars)) : '';
    const cutLen = truncateAtWord(fullSummary, maxSummaryChars).length;
    const remaining = fullSummary.length > cutLen ? fullSummary.slice(cutLen).trimStart() : '';
    const line2 = remaining ? escapeXml(truncateAtWord(remaining, maxSummaryChars)) : '';

    return `
      <g transform="translate(80, ${y})">
        <rect x="0" y="0" width="4" height="90" fill="${accentColor}" opacity="0.6" rx="2"/>
        <text x="24" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="600" fill="${textColor}">${title}</text>
        <text x="24" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="${secondaryColor}">${line1}</text>
        ${line2 ? `<text x="24" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="${secondaryColor}">${line2}</text>` : ''}
        <text x="24" y="90" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="${accentColor}" opacity="0.7">${source}</text>
      </g>`;
  }).join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="topGlow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Semi-transparent dark overlay for text readability -->
  <rect width="${width}" height="${height}" fill="${backgroundColor}" opacity="0.55"/>

  <!-- Top glow -->
  <rect width="${width}" height="300" fill="url(#topGlow)"/>

  <!-- Accent line -->
  <rect x="80" y="100" width="120" height="3" fill="${accentColor}" rx="1.5"/>

  <!-- Badge -->
  <text x="80" y="160" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="800" fill="${textColor}" letter-spacing="2">${escapeXml(theme.badge)}</text>

  <!-- Tagline -->
  <text x="80" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="${secondaryColor}" letter-spacing="1">${escapeXml(theme.tagline)}</text>

  <!-- Date -->
  <text x="80" y="260" font-family="'SF Mono', 'Fira Code', monospace" font-size="28" fill="${accentColor}" opacity="0.8">${escapeXml(date)}</text>

  <!-- Count badge -->
  <rect x="80" y="290" width="${80 + items.length.toString().length * 10}" height="32" rx="16" fill="${accentColor}" opacity="0.15"/>
  <text x="96" y="312" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="${accentColor}">${items.length} ${digest.lang === 'zh' ? '条新闻' : 'stories'}</text>

  <!-- Separator -->
  <line x1="80" y1="360" x2="${width - 80}" y2="360" stroke="${secondaryColor}" stroke-width="0.5" opacity="0.3"/>

  <!-- Items -->
  ${itemsSVG}

  <!-- Footer -->
  <line x1="80" y1="${height - 80}" x2="${width - 80}" y2="${height - 80}" stroke="${secondaryColor}" stroke-width="0.5" opacity="0.3"/>
  <text x="80" y="${height - 45}" font-family="'SF Mono', 'Fira Code', monospace" font-size="13" fill="${secondaryColor}">Generated by AI Daily News</text>
  <text x="${width - 80}" y="${height - 45}" font-family="'SF Mono', 'Fira Code', monospace" font-size="13" fill="${secondaryColor}" text-anchor="end">${escapeXml(date)}</text>
</svg>`;

  // Composite: bg image → dark overlay + text (SVG)
  const bgImage = sharp(BG_IMAGE_PATH).resize(width, height, { fit: 'cover' });
  const svgOverlay = Buffer.from(svg);

  await bgImage
    .composite([{ input: svgOverlay, top: 0, left: 0 }])
    .png()
    .toFile(outputPath);

  log.info(`Share image generated: ${outputPath}`);
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function truncateAtWord(str, max) {
  if (!str) return '';
  if (str.length <= max) return str;
  // For CJK text, cut at char boundary; for Latin, try word boundary
  const cut = str.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  // If mostly CJK (no spaces found in first half), just cut at max
  if (lastSpace <= max * 0.3) return cut.trimEnd() + '…';
  return cut.slice(0, lastSpace).trimEnd() + '…';
}
