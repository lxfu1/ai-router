import { checkAllChannels } from './channels';

let intervalId: ReturnType<typeof setInterval> | null = null;

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function startHealthCheck() {
  if (intervalId) return;
  // Run once immediately on startup
  checkAllChannels().catch(() => {});
  intervalId = setInterval(() => {
    checkAllChannels().catch(() => {});
  }, CHECK_INTERVAL_MS);
}

export function stopHealthCheck() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
