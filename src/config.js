import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function loadConfig() {
  const defaultConfig = JSON.parse(readFileSync(resolve(ROOT, 'config/default.json'), 'utf-8'));
  const localPath = resolve(ROOT, 'config/local.json');

  let config = defaultConfig;
  if (existsSync(localPath)) {
    const local = JSON.parse(readFileSync(localPath, 'utf-8'));
    config = deepMerge(defaultConfig, local);
  }

  // Env overrides
  if (process.env.OPENAI_API_KEY) {
    config.llm.openai.apiKey = process.env.OPENAI_API_KEY;
    if (config.llm.provider === 'template') config.llm.provider = 'openai';
  }
  if (process.env.ANTHROPIC_API_KEY) {
    config.llm.anthropic.apiKey = process.env.ANTHROPIC_API_KEY;
    if (config.llm.provider === 'template') config.llm.provider = 'anthropic';
  }
  if (process.env.LLM_PROVIDER) {
    config.llm.provider = process.env.LLM_PROVIDER;
  }

  config.root = ROOT;
  return config;
}

export function loadSources() {
  return JSON.parse(readFileSync(resolve(ROOT, 'config/sources.json'), 'utf-8'));
}
