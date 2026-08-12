export interface Env {
  API_BASE_URL: string;
  STREAM_SIGN_SECRET?: string;
  REQUIRE_SIGNATURE?: string;
}

const rateMap = new Map<string, { count: number; reset: number }>();

function checkRate(ip: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle OPTIONS preflight requests for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/media')) {
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    // IP rate limit check
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!checkRate(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Segment proxy handler
    if (url.pathname === '/api/media/segment') {
      const segmentUrl = url.searchParams.get('url');
      if (!segmentUrl) return new Response('Missing url', { status: 400, headers: corsHeaders });

      const segRes = await fetch(segmentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://xhamster.com/',
        },
      });
      return new Response(segRes.body, {
        headers: {
          'Content-Type': segRes.headers.get('Content-Type') || 'video/mp2t',
          'Accept-Ranges': 'bytes',
          ...corsHeaders,
        },
      });
    }

    const uuid = url.searchParams.get('uuid');
    const exp = url.searchParams.get('exp');
    const sig = url.searchParams.get('sig');
    const quality = url.searchParams.get('quality');

    if (!uuid) {
      return new Response(JSON.stringify({ error: 'uuid required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Optional signature enforcement
    if (env.REQUIRE_SIGNATURE === 'true') {
      if (!exp || !sig) {
        return new Response(JSON.stringify({ error: 'Signed URL required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      const now = Math.floor(Date.now() / 1000);
      if (Number(exp) < now) {
        return new Response(JSON.stringify({ error: 'Signed URL expired' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    try {
      // 1. Get video info from Node.js API
      const apiRes = await fetch(`${env.API_BASE_URL}/api/videos/uuid/${uuid}`);
      if (!apiRes.ok) {
        return new Response(JSON.stringify({ error: 'Video not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      const video = await apiRes.json() as any;

      const m3u8List: string[] = video.m3u8Links || [];
      if (m3u8List.length === 0) {
        return new Response(JSON.stringify({ error: 'No stream available' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Quality selection logic
      let originalM3u8 = m3u8List[0]; // default best

      if (quality) {
        const matched = m3u8List.find((link: string) =>
          link.includes(`${quality}p`) || link.includes(quality)
        );
        if (matched) originalM3u8 = matched;
      }

      // 2. Fetch original m3u8
      const m3u8Res = await fetch(originalM3u8, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://xhamster.com/'
        }
      });

      if (!m3u8Res.ok) {
        return new Response('Failed to fetch stream', { status: 502, headers: corsHeaders });
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
          'Cache-Control': 'no-cache',
          ...corsHeaders
        }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};
