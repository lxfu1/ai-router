import { checkAllChannels } from './channels';
import { createLogger } from './logger';

const logger = createLogger('HealthCheck');

let intervalId: ReturnType<typeof setInterval> | null = null;

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function startHealthCheck() {
  if (intervalId) return;
  // Run once immediately on startup
  checkAllChannels().catch((err) => {
    logger.error('Initial health check failed', { error: err instanceof Error ? err.message : String(err) });
  });
  intervalId = setInterval(() => {
    checkAllChannels().catch((err) => {
      logger.error('Scheduled health check failed', { error: err instanceof Error ? err.message : String(err) });
    });
  }, CHECK_INTERVAL_MS);
  logger.info('Health check started', { intervalMs: CHECK_INTERVAL_MS });
}

export function stopHealthCheck() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Health check stopped');
  }
}