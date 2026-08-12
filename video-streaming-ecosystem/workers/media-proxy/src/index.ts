export interface Env {
  API_BASE_URL: string; // https://your-node-api.com
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only handle /api/media
    if (!url.pathname.startsWith('/api/media')) {
      return new Response('Not Found', { status: 404 });
    }

    const uuid = url.searchParams.get('uuid');
    if (!uuid) {
      return new Response(JSON.stringify({ error: 'uuid required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // 1. Get video info from Node.js API
      const apiRes = await fetch(`${env.API_BASE_URL}/api/videos/uuid/${uuid}`);
      if (!apiRes.ok) {
        return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404 });
      }
      const video = await apiRes.json() as any;

      const m3u8List: string[] = video.m3u8Links || [];
      if (m3u8List.length === 0) {
        return new Response(JSON.stringify({ error: 'No stream available' }), { status: 404 });
      }

      // Use the first (usually best) m3u8
      const originalM3u8 = m3u8List[0];

      // 2. Fetch original m3u8
      const m3u8Res = await fetch(originalM3u8, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://xhamster.com/'
        }
      });

      if (!m3u8Res.ok) {
        return new Response('Failed to fetch stream', { status: 502 });
      }

      let playlist = await m3u8Res.text();

      // 3. Rewrite segment URLs so they go through this Worker
      const workerOrigin = url.origin;
      playlist = playlist.replace(/(https?:\/\/[^\s"]+\.ts)/g, (match) => {
        return `${workerOrigin}/api/media/segment?url=${encodeURIComponent(match)}&uuid=${uuid}`;
      });

      // Also handle relative paths
      playlist = playlist.replace(/^([^#\s].+\.ts)$/gm, (match) => {
        const absolute = new URL(match, originalM3u8).href;
        return `${workerOrigin}/api/media/segment?url=${encodeURIComponent(absolute)}&uuid=${uuid}`;
      });

      return new Response(playlist, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
};
