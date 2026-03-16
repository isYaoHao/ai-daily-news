#!/usr/bin/env node

/**
 * CLI entrypoint for AI Daily News.
 *
 * Usage:
 *   node src/cli.js                    # Generate all language digests
 *   node src/cli.js --lang en          # English only
 *   node src/cli.js --lang zh          # Chinese only
 *   node src/cli.js --quiet            # Suppress logs (for cron)
 */
import { Command } from 'commander';
import { run } from './index.js';
import { getLogger } from './logger.js';

const program = new Command();

program
  .name('ai-daily-news')
  .description('Generate daily AI news digests with share images')
  .version('1.0.0')
  .option('-l, --lang <lang>', 'Language: en, zh, or all', 'all')
  .option('-q, --quiet', 'Suppress log output', false)
  .action(async (opts) => {
    // Init logger with quiet mode before running
    getLogger({ quiet: opts.quiet });

    try {
      const results = await run({
        lang: opts.lang,
        quiet: opts.quiet,
      });

      if (!opts.quiet) {
        console.log('\n✅ Digest generation complete:');
        for (const r of results) {
          console.log(`  [${r.lang}] ${r.articleCount} articles → ${r.mdPath}`);
        }
      }
    } catch (err) {
      console.error('❌ Pipeline failed:', err.message);
      process.exit(1);
    }
  });

program.parse();
