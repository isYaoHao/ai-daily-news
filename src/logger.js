import pino from 'pino';

let logger;

export function getLogger(opts = {}) {
  if (!logger) {
    logger = pino({
      level: opts.quiet ? 'error' : (opts.level || 'info'),
      transport: opts.quiet ? undefined : {
        target: 'pino/file',
        options: { destination: 1 }
      }
    });
  }
  return logger;
}
