/**
 * Runs once when the server starts. The database work lives in a Node-only
 * module so the Edge bundle (used by the locale proxy) never sees it.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DATABASE_URL) {
    await import('./instrumentation-node');
  }
}
