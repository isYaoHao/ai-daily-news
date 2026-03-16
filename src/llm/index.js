/**
 * LLM adapter layer. Selects provider based on config.
 */
import { generateTemplateDigest } from './template.js';
import { generateOpenAIDigest } from './openai.js';
import { generateAnthropicDigest } from './anthropic.js';
import { getLogger } from '../logger.js';

/**
 * Generate a digest for the given articles and language.
 * Falls back to template mode if LLM is unavailable.
 */
export async function generateDigest(articles, lang, config) {
  const log = getLogger();
  const provider = config.llm?.provider || 'template';
  const date = config.date || new Date().toISOString().slice(0, 10);
  const maxItems = config.digest?.maxItems || 15;

  const opts = { date, maxItems };

  try {
    switch (provider) {
      case 'openai':
        return await generateOpenAIDigest(articles, lang, {
          ...opts,
          apiKey: config.llm.openai.apiKey,
          model: config.llm.openai.model,
        });

      case 'anthropic':
        return await generateAnthropicDigest(articles, lang, {
          ...opts,
          apiKey: config.llm.anthropic.apiKey,
          model: config.llm.anthropic.model,
        });

      case 'template':
      default:
        log.info(`Using template mode for ${lang} digest`);
        return generateTemplateDigest(articles, lang, opts);
    }
  } catch (err) {
    log.warn(`LLM provider "${provider}" failed: ${err.message}, falling back to template`);
    return generateTemplateDigest(articles, lang, opts);
  }
}
