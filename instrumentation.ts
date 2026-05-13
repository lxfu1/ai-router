export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startHealthCheck } = await import('./lib/health-check')
    startHealthCheck()
    const { startRateLimitCleanup } = await import('./lib/rate-limit')
    startRateLimitCleanup()
    const { runSecurityChecks } = await import('./lib/security-check')
    runSecurityChecks()
  }
}