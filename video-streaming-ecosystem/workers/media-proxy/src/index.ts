export interface Env {
  API_BASE_URL: string;
  STREAM_SIGN_SECRET: string;
  REQUIRE_SIGNED?: string;
  REQUIRE_SIGNATURE?: string;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}

function originHeadersFor(link: string): Record<string, string> {
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  try {
    const u = new URL(link);
    const host = u.hostname.toLowerCase();

    // Sex303 / files4host / direct MP4: ONLY minimal headers with matching origin
    if (host.includes("files4host") || host.includes("sex303") || link.endsWith(".mp4") || link.includes(".mp4?")) {
      return {
        "User-Agent": ua,
        "Accept": "*/*",
        "Referer": `${u.origin}/`,
        "Origin": u.origin,
      };
    }

    // xHamster / xh domains: xHamster origin headers
    if (host.includes("xhamster") || host.includes("newxh") || host.includes("xhcdn")) {
      return {
        "User-Agent": ua,
        "Referer": "https://xhamster.com/",
        "Origin": "https://xhamster.com",
        "Accept": "*/*",
      };
    }

    // Default fallback for generic media hosts
    return {
      "User-Agent": ua,
      "Referer": `${u.origin}/`,
      "Origin": u.origin,
      "Accept": "*/*",
    };
  } catch {
    return {
      "User-Agent": ua,
      "Accept": "*/*",
    };
  }
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifySigned(
  uuid: string,
  exp: string | null,
  sig: string | null,
  secret: string,
  requireSigned: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (!exp && !sig) {
    if (requireSigned) return { ok: false, error: "Signed link required" };
    return { ok: true };
  }

  if (!exp || !sig) return { ok: false, error: "Invalid signature params" };

  const expNum = Number(exp);
  if (!Number.isFinite(expNum)) return { ok: false, error: "Invalid exp" };
  if (Math.floor(Date.now() / 1000) > expNum) {
    return { ok: false, error: "Link expired" };
  }

  const expectedFull = await hmacHex(secret, `${uuid}:${exp}`);
  const expected = expectedFull.slice(0, 32);

  if (expected.length !== sig.length) return { ok: false, error: "Invalid signature" };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  if (diff !== 0) return { ok: false, error: "Invalid signature" };

  return { ok: true };
}

function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}

// Detect xHamster IP-locked tokens: contain /data=IP.ADDRESS-dvp/ in path.
// These links ONLY work from the IP that scraped them (Render's IP).
// Cloudflare Worker (always a different edge IP) will get 403 on these.
function isIpLocked(link: string): boolean {
  return /\/data=[\d.]+-dvp\//.test(link);
}

function rewriteM3u8(body: string, workerOrigin: string, uuid: string, search: string, playlistBaseUrl: string): string {
  const q = search.startsWith("?") ? search : search ? `?${search}` : "";
  return body
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return line;

      // 1. Rewrite AES-128 Key URIs: #EXT-X-KEY:METHOD=AES-128,URI="..."
      if (t.includes("#EXT-X-KEY:")) {
        return t.replace(/URI="([^"]+)"/, (_, keyUri) => {
          const absoluteKeyUrl = resolveUrl(keyUri, playlistBaseUrl);
          const encoded = encodeURIComponent(absoluteKeyUrl);
          const proxied = `${workerOrigin}/api/key?uuid=${encodeURIComponent(uuid)}&u=${encoded}${
            q ? "&" + q.slice(1) : ""
          }`;
          return `URI="${proxied}"`;
        });
      }

      if (t.startsWith("#")) return line;

      // 2. Rewrite segment URLs (resolve relative paths first)
      const absoluteSegmentUrl = resolveUrl(t, playlistBaseUrl);
      const encoded = encodeURIComponent(absoluteSegmentUrl);
      return `${workerOrigin}/api/segment?uuid=${encodeURIComponent(uuid)}&u=${encoded}${
        q ? "&" + q.slice(1) : ""
      }`;
    })
    .join("\n");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const apiBase = (env.API_BASE_URL || "https://lumenstream-api.onrender.com").replace(/\/$/, "");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // GET /api/media?uuid=&exp=&sig=
    if (url.pathname === "/api/media") {
      const uuid = url.searchParams.get("uuid");
      if (!uuid) {
        return new Response(JSON.stringify({ error: "uuid required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      const exp = url.searchParams.get("exp");
      const sig = url.searchParams.get("sig");
      const requireSignedVal = (env.REQUIRE_SIGNED || env.REQUIRE_SIGNATURE || "").toLowerCase();
      const requireSigned = requireSignedVal === "true";

      const check = await verifySigned(uuid, exp, sig, env.STREAM_SIGN_SECRET, requireSigned);
      if (!check.ok) {
        return new Response(JSON.stringify({ error: check.error }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      // Fetch video metadata from API — bypass cache with no-cache header so stale stream data isn't served
      let metaRes = await fetch(`${apiBase}/api/videos/uuid/${uuid}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!metaRes.ok) {
        metaRes = await fetch(`${apiBase}/api/videos/${uuid}`, {
          headers: { 'Cache-Control': 'no-cache' },
        });
      }

      if (!metaRes.ok) {
        return new Response(JSON.stringify({ error: "Video not found", uuid, apiBase }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      let video = (await metaRes.json()) as any;

      if (video.status === "dead") {
        return new Response(JSON.stringify({ error: "Stream unavailable" }), {
          status: 410,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      // Collect candidate links with multi-casing support (m3u8Links, m3u8_links, directVideoLinks, direct_video_links, videoUrl, video_url)
      const collectCandidateLinks = (vData: any): string[] => {
        const links: string[] = [];
        const fields = [
          vData.m3u8Links,
          vData.m3u8_links,
          vData.directVideoLinks,
          vData.direct_video_links,
          vData.videoUrl,
          vData.video_url,
        ];

        for (const field of fields) {
          if (!field) continue;
          let list = field;
          if (typeof list === "string") {
            try { list = JSON.parse(list); } catch { list = [list]; }
          }
          if (Array.isArray(list)) {
            for (const item of list) {
              if (typeof item === "string" && item.trim()) links.push(item.trim());
              else if (item && typeof item === "object" && item.url) links.push(item.url);
            }
          } else if (typeof list === "string" && list.trim()) {
            links.push(list.trim());
          }
        }
        return [...new Set(links)];
      };

      let candidateLinks = collectCandidateLinks(video);
      const reqRange = request.headers.get("Range");

      // Try fetching candidate stream links using dynamic per-link origin headers
      let upstreamRes: Response | null = null;
      let workingLink = "";
      const failedLinkStatuses: Record<string, number> = {};
      for (const link of candidateLinks) {
        try {
          const headers = {
            ...originHeadersFor(link),
            ...(reqRange ? { Range: reqRange } : {}),
          };
          // redirect: 'follow' ensures CDN 302→MP4 redirects are handled
          const res = await fetch(link, { headers, redirect: 'follow' });
          if (res.ok || res.status === 206) {
            upstreamRes = res;
            workingLink = link;
            break;
          } else {
            failedLinkStatuses[link.slice(0, 80)] = res.status;
          }
        } catch (e: any) {
          failedLinkStatuses[link.slice(0, 80)] = -1; // network error
        }
      }

      // If candidate links failed (expired tokens or empty links), trigger auto-refresh from API
      if (!upstreamRes) {
        try {
          const refreshRes = await fetch(`${apiBase}/api/videos/${uuid}/refresh`, {
            method: "POST",
          });
          if (refreshRes.ok) {
            const refreshedVideo = await refreshRes.json();
            const newLinks = collectCandidateLinks(refreshedVideo);
            for (const link of newLinks) {
              try {
                const headers = {
                  ...originHeadersFor(link),
                  ...(reqRange ? { Range: reqRange } : {}),
                };
                const res = await fetch(link, { headers, redirect: 'follow' });
                if (res.ok || res.status === 206) {
                  upstreamRes = res;
                  workingLink = link;
                  break;
                } else {
                  failedLinkStatuses[link.slice(0, 80)] = res.status;
                }
              } catch {}
            }
          }
        } catch {}
      }

      if (!upstreamRes) {
        // Final fallback: if any candidate links are IP-locked (xHamster tokens),
        // route through Render stream-proxy which has the correct IP
        const hasIpLockedLinks = candidateLinks.some(isIpLocked);
        if (hasIpLockedLinks) {
          const proxyUrl = `${apiBase}/api/videos/${uuid}/stream-proxy`;
          try {
            const proxyHeaders: Record<string, string> = {};
            if (reqRange) proxyHeaders['Range'] = reqRange;
            const proxyRes = await fetch(proxyUrl, { headers: proxyHeaders, redirect: 'follow' });
            if (proxyRes.ok || proxyRes.status === 206) {
              upstreamRes = proxyRes;
              workingLink = proxyUrl;
            }
          } catch {}
        }
      }

      if (!upstreamRes) {
        return new Response(
          JSON.stringify({
            error: "No stream",
            debug: {
              uuid,
              linkCount: candidateLinks.length,
              candidateLinksPreview: candidateLinks.map((l) => l.slice(0, 80)),
              videoStatus: video?.status || "unknown",
              hasM3u8: !!(video?.m3u8Links || video?.m3u8_links),
              hasMp4: !!(video?.directVideoLinks || video?.direct_video_links),
              m3u8LinksRaw: video?.m3u8Links ?? null,
              directVideoLinksRaw: video?.directVideoLinks ?? null,
              failedStatuses: failedLinkStatuses,
            },
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
          }
        );
      }

      const contentType = upstreamRes.headers.get("Content-Type") || "";
      if (contentType.includes("mpegurl") || workingLink.includes(".m3u8")) {
        const text = await upstreamRes.text();
        const signedQuery = new URLSearchParams();
        if (exp) signedQuery.set("exp", exp);
        if (sig) signedQuery.set("sig", sig);
        const qs = signedQuery.toString();

        const rewritten = rewriteM3u8(text, url.origin, uuid, qs, workingLink);

        return new Response(rewritten, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=86400",
            ...corsHeaders(),
          },
        });
      } else {
        // Direct MP4 video stream pipe with Range & Partial Content support
        const headers = new Headers(corsHeaders());
        headers.set("Content-Type", contentType || "video/mp4");
        headers.set("Accept-Ranges", "bytes");
        if (upstreamRes.headers.get("Content-Range")) {
          headers.set("Content-Range", upstreamRes.headers.get("Content-Range")!);
        }
        if (upstreamRes.headers.get("Content-Length")) {
          headers.set("Content-Length", upstreamRes.headers.get("Content-Length")!);
        }
        headers.set("Cache-Control", "public, max-age=3600");
        return new Response(upstreamRes.body, { status: upstreamRes.status, headers });
      }
    }

    // GET /api/key?uuid=&u=&exp=&sig=
    if (url.pathname === "/api/key") {
      const uuid = url.searchParams.get("uuid") || "";
      const target = url.searchParams.get("u");
      const exp = url.searchParams.get("exp");
      const sig = url.searchParams.get("sig");
      const requireSignedVal = (env.REQUIRE_SIGNED || env.REQUIRE_SIGNATURE || "").toLowerCase();
      const requireSigned = requireSignedVal === "true";

      if (!target) {
        return new Response("missing u", { status: 400, headers: corsHeaders() });
      }

      const check = await verifySigned(uuid, exp, sig, env.STREAM_SIGN_SECRET, requireSigned);
      if (!check.ok) {
        return new Response(check.error || "Forbidden", { status: 403, headers: corsHeaders() });
      }

      let keyUrl = target;
      try { keyUrl = decodeURIComponent(target); } catch {}

      const upstream = await fetch(keyUrl, {
        headers: originHeadersFor(keyUrl),
      });

      const headers = new Headers(corsHeaders());
      headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/octet-stream");
      headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");

      return new Response(upstream.body, { status: upstream.status, headers });
    }

    // GET /api/segment?uuid=&u=&exp=&sig=
    if (url.pathname === "/api/segment") {
      const uuid = url.searchParams.get("uuid") || "";
      const target = url.searchParams.get("u");
      const exp = url.searchParams.get("exp");
      const sig = url.searchParams.get("sig");
      const requireSignedVal = (env.REQUIRE_SIGNED || env.REQUIRE_SIGNATURE || "").toLowerCase();
      const requireSigned = requireSignedVal === "true";

      if (!target) {
        return new Response("missing u", { status: 400, headers: corsHeaders() });
      }

      const check = await verifySigned(uuid, exp, sig, env.STREAM_SIGN_SECRET, requireSigned);
      if (!check.ok) {
        return new Response(check.error || "Forbidden", { status: 403, headers: corsHeaders() });
      }

      let segmentUrl = target;
      try {
        segmentUrl = decodeURIComponent(target);
      } catch {}

      const reqRange = request.headers.get("Range");
      const headers = {
        ...originHeadersFor(segmentUrl),
        ...(reqRange ? { Range: reqRange } : {}),
      };

      const upstream = await fetch(segmentUrl, { headers });

      const resHeaders = new Headers(corsHeaders());
      resHeaders.set("Content-Type", upstream.headers.get("Content-Type") || "video/mp2t");
      resHeaders.set("Accept-Ranges", "bytes");
      if (upstream.headers.get("Content-Range")) {
        resHeaders.set("Content-Range", upstream.headers.get("Content-Range")!);
      }
      if (upstream.headers.get("Content-Length")) {
        resHeaders.set("Content-Length", upstream.headers.get("Content-Length")!);
      }
      resHeaders.set("Cache-Control", "public, max-age=31536000, immutable");

      return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders() });
  },
};
