export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startHealthCheck } = await import('./lib/health-check')
    startHealthCheck()
  }
}