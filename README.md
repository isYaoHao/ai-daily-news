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

## Architecture

```
src/
  cli.js              # CLI entrypoint (Commander)
  index.js            # Main pipeline orchestrator
  config.js           # Config loader (default + local + env)
  logger.js           # Pino logger
  sources/
    index.js          # Source aggregator & deduper
    rss.js            # RSS feed fetcher
    html.js           # HTML/JSON API fetcher
  llm/
    index.js          # LLM adapter (provider selection + fallback)
    template.js       # Template-based digest (no LLM)
    openai.js         # OpenAI adapter
    anthropic.js      # Anthropic Claude adapter
  image/
    generate.js       # SVG → PNG share image generator
config/
  default.json        # Default configuration
  sources.json        # News source definitions
  local.json          # Local overrides (gitignored)
scripts/
  cron-run.sh         # Cron helper script
```

## Requirements

- Node.js ≥ 20
- npm

## License

MIT
