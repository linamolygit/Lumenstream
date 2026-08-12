import cron from 'node-cron';

export function startRefreshJob() {
  // Har 6 hour baad chalega
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Refresh Job] Starting auto-refresh...');
    
    try {
      const scraperUrl = process.env.SCRAPER_URL || 'http://localhost:8000';
      const response = await fetch(`${scraperUrl}/refresh/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: 25,
          only_dead: false, // active + dead dono check karega
        }),
      });

      const data = await response.json();
      console.log('[Refresh Job] Done:', data.message);
    } catch (err) {
      console.error('[Refresh Job] Failed:', err.message);
    }
  });

  console.log('[Refresh Job] Scheduled (every 6 hours)');
}
