# AI Daily News

Generate daily AI news digests in **Chinese** and **English** with minimalist tech-style share images.

## Features

- 📰 Configurable RSS and HTML/API news sources
- 🌏 Separate Chinese & English digests
- 🖼️ Auto-generated minimalist share images (SVG → PNG via Sharp)
- 🤖 LLM-powered summaries (OpenAI / Anthropic) with template fallback
- 📁 Organized daily output (`output/YYYY-MM-DD/`)
- ⏰ Cron-ready helper script

## Quick Start

```bash
# Install dependencies
npm install

# Generate today's digests (both languages)
npm run digest

# English only
npm run digest:en

# Chinese only
npm run digest:zh
```

## Output Structure

```
output/
  2026-03-17/
    digest-en.md        # English markdown digest
    digest-en.json      # Structured JSON
    share-en.png        # English share image
    digest-zh.md        # Chinese markdown digest
    digest-zh.json      # Structured JSON
    share-zh.png        # Chinese share image
```

## Configuration

### News Sources

Edit `config/sources.json` to add/remove RSS feeds or API sources.

### LLM Provider

By default, digests use **template mode** (no API keys needed). To enable LLM-powered summaries:

```bash
# Option A: Environment variables
export OPENAI_API_KEY=sk-...
# or
export ANTHROPIC_API_KEY=sk-ant-...

# Option B: Local config
cp config/default.json config/local.json
# Edit config/local.json with your API keys
```

Set `LLM_PROVIDER` env var to `openai`, `anthropic`, or `template` to override.

### Image Style

Customize colors and dimensions in `config/default.json` under `image`:

```json
{
  "image": {
    "width": 1200,
    "height": 1600,
    "backgroundColor": "#0a0a0a",
    "accentColor": "#00d4ff",
    "textColor": "#e0e0e0"
  }
}
```

## CLI Usage

```bash
node src/cli.js [options]

Options:
  -l, --lang <lang>  Language: en, zh, or all (default: "all")
  -q, --quiet        Suppress log output (default: false)
  -V, --version      Output version number
  -h, --help         Display help
```

## Cron / Scheduled Runs

A helper script is provided for daily automation:

```bash
# OpenClaw cron example (daily 6:00 AM):
# command: "bash /Users/yaohao/Developer/ai-daily-news/scripts/cron-run.sh"
# schedule: "0 6 * * *"
```

Or use npm:

```bash
npm run cron
```

## Code Structure

### High-level flow

```text
CLI (src/cli.js)
  → load config (src/config.js)
  → fetch news sources (src/sources/*)
  → dedupe + sort articles
  → generate digest (src/llm/*)
  → write markdown/json output
  → render share image (src/image/generate.js)
```

### Project tree

```text
.
├── assets/
│   └── bg-cover.png              # Background image used by the share poster renderer
├── config/
│   ├── default.json              # Base config: output, digest, image, fetch, llm
│   ├── local.json                # Local overrides (gitignored, for private keys / env-specific settings)
│   └── sources.json              # Source definitions for RSS / HTML / JSON API inputs
├── output/
│   └── YYYY-MM-DD/               # Generated daily artifacts grouped by date
│       ├── digest-en.md
│       ├── digest-en.json
│       ├── digest-zh.md
│       ├── digest-zh.json
│       ├── share-en.png
│       └── share-zh.png
├── scripts/
│   └── cron-run.sh               # Wrapper used for scheduled runs
├── src/
│   ├── cli.js                    # Commander-based CLI entrypoint, parses --lang / --quiet
│   ├── index.js                  # Main pipeline orchestrator: fetch → digest → save → image
│   ├── config.js                 # Merges default.json + local.json + environment overrides
│   ├── logger.js                 # Shared Pino logger factory
│   ├── sources/
│   │   ├── index.js              # Loads configured sources, dispatches fetchers, dedupes, sorts
│   │   ├── rss.js                # RSS parser-based source adapter
│   │   └── html.js               # HTML / JSON API adapter (currently JSON API focused)
│   ├── llm/
│   │   ├── index.js              # Provider router + fallback-to-template logic
│   │   ├── template.js           # No-key fallback summarizer
│   │   ├── openai.js             # OpenAI digest generator
│   │   ├── anthropic.js          # Anthropic digest generator
│   │   └── gemini.js             # Gemini digest generator
│   └── image/
│       └── generate.js           # Builds poster HTML and screenshots it with Puppeteer
├── README.md
├── package.json
└── package-lock.json
```

### Module responsibilities

- `src/cli.js`
  - Exposes the CLI command.
  - Validates runtime options such as language and quiet mode.
  - Calls the main `run()` pipeline.

- `src/index.js`
  - Central orchestration layer.
  - Computes the current output date.
  - Runs each requested language separately.
  - Writes markdown + JSON outputs and triggers image generation.

- `src/config.js`
  - Loads `config/default.json` first.
  - Deep-merges `config/local.json` when present.
  - Applies environment overrides like `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `LLM_PROVIDER`.

- `src/sources/index.js`
  - Reads source definitions from `config/sources.json`.
  - Fans out to RSS and HTML/API fetchers.
  - Filters by language, removes duplicates, and sorts by publish time.

- `src/sources/rss.js`
  - Uses `rss-parser` to normalize RSS feed items into a common article shape.

- `src/sources/html.js`
  - Handles non-RSS sources.
  - Currently supports JSON API style parsing (for example HN Algolia-like payloads).
  - Leaves room for future generic HTML scraping.

- `src/llm/index.js`
  - Selects the active digest provider.
  - Falls back to `template.js` if an LLM call fails.

- `src/llm/template.js`
  - Ensures the pipeline still works without external model credentials.

- `src/llm/openai.js` / `anthropic.js` / `gemini.js`
  - Provider-specific prompt + response handling.
  - Return a shared digest payload shape used by downstream output/image modules.

- `src/image/generate.js`
  - Converts digest data into an HTML poster.
  - Embeds `assets/bg-cover.png` and uses Puppeteer to render a final PNG.

### Data contracts

A normalized article object flowing through the pipeline looks roughly like this:

```js
{
  title: '...',
  link: 'https://...',
  summary: '...',
  pubDate: new Date(),
  source: 'Feed Name',
  lang: 'en' | 'zh',
  category: 'ai'
}
```

A generated digest payload looks roughly like this:

```js
{
  title: 'AI Daily News',
  date: '2026-03-18',
  lang: 'en',
  markdown: '# ...',
  items: [
    {
      title: '...',
      summary: '...',
      source: '...'
    }
  ]
}
```

## Requirements

- Node.js ≥ 20
- npm

## License

MIT
