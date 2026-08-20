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

// Known direct-MP4, blog CDN, and hotlinked video host list
const directMp4Hosts = [
  "files4host",
  "upserv.xyz",
  "mmsbee",
  "server15",
  "fsiblog",
  "zproxy",
  "xbaaz",
  "desixxx",
  "cdn-thumb",
  "sex303",
  "streamtape",
  "doodstream",
  "mixdrop",
  "videobin",
  "storage",
  "b-cdn",
  "r2.dev",
];

/**
 * Universal Origin Header Engine:
 * Generates appropriate headers based on link domain, source page URL & mode to prevent 401/403 blocks across any site.
 */
function originHeadersFor(
  link: string,
  mode: "smart" | "clean" | "origin" | "source" = "smart",
  sourcePageUrl?: string
): Record<string, string> {
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  try {
    const u = new URL(link);
    const host = u.hostname.toLowerCase();

    if (mode === "clean") {
      // Minimal bare headers for CDNs that reject foreign or non-empty Referers
      return {
        "User-Agent": ua,
        "Accept": "*/*",
      };
    }

    if (mode === "origin") {
      return {
        "User-Agent": ua,
        "Accept": "*/*",
        "Referer": `${u.origin}/`,
        "Origin": u.origin,
      };
    }

    if (mode === "source" && sourcePageUrl) {
      try {
        const su = new URL(sourcePageUrl);
        return {
          "User-Agent": ua,
          "Accept": "*/*",
          "Referer": sourcePageUrl,
          "Origin": su.origin,
        };
      } catch {}
    }

    // mode === "smart":
    // 1. Direct-MP4 / Blog CDNs / Desi tube CDNs (files4host, upserv, mmsbee, fsiblog, xbaaz, desixxx, etc.)
    if (directMp4Hosts.some((h) => host.includes(h)) || link.includes(".mp4")) {
      const ref = sourcePageUrl || `https://${host}/`;
      return {
        "User-Agent": ua,
        "Accept": "*/*",
        "Referer": ref,
        "Origin": `https://${host}`,
      };
    }

    // 2. Canonical Tube CDN families:
    if (
      host.includes("xhcdn") ||
      host.includes("xhamster") ||
      host.includes("newxh") ||
      host.includes("xhvid") ||
      host.includes("xhchannel") ||
      host.includes("xhpingcdn")
    ) {
      return {
        "User-Agent": ua,
        "Referer": "https://xhamster.com/",
        "Origin": "https://xhamster.com",
        "Accept": "*/*",
      };
    }

    if (host.includes("phncdn") || host.includes("pornhub")) {
      return {
        "User-Agent": ua,
        "Referer": "https://www.pornhub.com/",
        "Origin": "https://www.pornhub.com",
        "Accept": "*/*",
      };
    }

    if (host.includes("xvideos") || host.includes("xv-cdn") || host.includes("xvideos-cdn")) {
      return {
        "User-Agent": ua,
        "Referer": "https://www.xvideos.com/",
        "Origin": "https://www.xvideos.com",
        "Accept": "*/*",
      };
    }

    if (host.includes("spankbang") || host.includes("sb-cd")) {
      return {
        "User-Agent": ua,
        "Referer": "https://spankbang.com/",
        "Origin": "https://spankbang.com",
        "Accept": "*/*",
      };
    }

    if (host.includes("redgifs")) {
      return {
        "User-Agent": ua,
        "Referer": "https://www.redgifs.com/",
        "Origin": "https://www.redgifs.com",
        "Accept": "*/*",
      };
    }

    if (host.includes("eporner")) {
      return {
        "User-Agent": ua,
        "Referer": "https://www.eporner.com/",
        "Origin": "https://www.eporner.com",
        "Accept": "*/*",
      };
    }

    // Default fallback: use sourcePageUrl if available or same-origin style
    const origin = `https://${host}`;
    return {
      "User-Agent": ua,
      "Accept": "*/*",
      "Referer": sourcePageUrl || `${origin}/`,
      "Origin": origin,
    };
  } catch {
    return {
      "User-Agent": ua,
      "Accept": "*/*",
    };
  }
}

async function fetchUpstreamWithFallback(
  link: string,
  reqRange: string | null,
  sourcePageUrl?: string
): Promise<{ res: Response | null; statusMap: Record<string, number> }> {
  const modes: Array<"smart" | "clean" | "origin" | "source"> = ["smart", "clean", "origin"];
  if (sourcePageUrl) modes.push("source");

  const statusMap: Record<string, number> = {};

  for (const mode of modes) {
    try {
      const headers: Record<string, string> = {
        ...originHeadersFor(link, mode, sourcePageUrl),
        ...(reqRange ? { Range: reqRange } : {}),
      };

      const res = await fetch(link, { headers, redirect: "follow" });
      statusMap[`${link.slice(0, 70)} [${mode}]`] = res.status;

      if (res.ok || res.status === 206) {
        return { res, statusMap };
      }
    } catch {
      statusMap[`${link.slice(0, 70)} [${mode}]`] = -1;
    }
  }

  return { res: null, statusMap };
}

// Detect tokens with IP bindings: /data=IP.ADDRESS-dvp/
function isIpLocked(link: string): boolean {
  return /\/data=[\d.]+-dvp\//.test(link);
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

function rewriteM3u8(
  body: string,
  workerOrigin: string,
  uuid: string,
  search: string,
  playlistBaseUrl: string
): string {
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

/** Collect m3u8 + mp4 with smart priority scoring */
function collectCandidateLinks(vData: any): string[] {
  if (!vData) return [];
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
      const s = list.trim();
      if (!s) continue;
      try {
        list = JSON.parse(s);
      } catch {
        list = [s];
      }
    }
    if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item === "string" && item.trim()) links.push(item.trim());
        else if (item && typeof item === "object" && item.url) links.push(String(item.url));
      }
    } else if (typeof list === "string" && list.trim()) {
      links.push(list.trim());
    }
  }

  // Priority Ranking: Direct MP4 (sex303/upserv/mmsbee/files4host) first -> Non-IP-locked m3u8 -> IP-locked last
  const unique = [...new Set(links)];
  unique.sort((a, b) => {
    const score = (u: string) => {
      let s = 0;
      if (u.includes("data=") && /\d+\.\d+\.\d+\.\d+/.test(u)) s -= 100; // IP-locked last (handled via Render proxy)
      if (directMp4Hosts.some((h) => u.toLowerCase().includes(h))) s += 60; // Known direct MP4 host boost
      if (u.includes(".mp4") && !u.includes(".m3u8")) s += 50; // Direct MP4 priority
      if (u.includes("master") || u.includes("multi=")) s += 30; // Master HLS playlist
      if (u.includes(".m3u8")) s += 20; // HLS playlist
      return s;
    };
    return score(b) - score(a);
  });
  return unique;
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

      // Fetch video metadata from API — bypass cache with no-cache header
      let metaRes = await fetch(`${apiBase}/api/videos/uuid/${uuid}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!metaRes.ok) {
        metaRes = await fetch(`${apiBase}/api/videos/${uuid}`, {
          headers: { "Cache-Control": "no-cache" },
        });
      }

      if (!metaRes.ok) {
        return new Response(JSON.stringify({ error: "Video not found", uuid, apiBase }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      let video = (await metaRes.json()) as any;
      if (video?.data && (video.data.uuid || video.data.m3u8Links || video.data.directVideoLinks)) {
        video = video.data;
      }

      if (video.status === "dead") {
        return new Response(JSON.stringify({ error: "Stream unavailable" }), {
          status: 410,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      let candidateLinks = collectCandidateLinks(video);
      const reqRange = request.headers.get("Range");

      let upstreamRes: Response | null = null;
      let workingLink = "";
      const failedStatuses: Record<string, number> = {};

      // 1. Try direct fetch for each candidate link with multi-header fallback
      for (const link of candidateLinks) {
        const { res, statusMap } = await fetchUpstreamWithFallback(link, reqRange, video.sourcePageUrl);
        Object.assign(failedStatuses, statusMap);
        if (res) {
          upstreamRes = res;
          workingLink = link;
          break;
        }
      }

      // 2. If candidate links failed (expired token or empty links), trigger auto-refresh from API
      if (!upstreamRes) {
        try {
          const refreshRes = await fetch(`${apiBase}/api/videos/${uuid}/refresh`, {
            method: "POST",
            headers: { "Cache-Control": "no-cache" },
          });
          if (refreshRes.ok) {
            let refreshedVideo = await refreshRes.json();
            if (refreshedVideo?.data) refreshedVideo = refreshedVideo.data;
            const newLinks = collectCandidateLinks(refreshedVideo);
            for (const link of newLinks) {
              const { res, statusMap } = await fetchUpstreamWithFallback(
                link,
                reqRange,
                refreshedVideo.sourcePageUrl || video.sourcePageUrl
              );
              Object.assign(failedStatuses, statusMap);
              if (res) {
                upstreamRes = res;
                workingLink = link;
                break;
              }
            }
          }
        } catch {}
      }

      // 3. Universal Render IP Proxy Fallback:
      // If direct Cloudflare edge fetch failed for ANY reason (IP-locked tokens, CDN blocking CF IPs, etc.)
      if (!upstreamRes) {
        const proxyUrls = [
          `${apiBase}/api/videos/${uuid}/stream-proxy`,
          `${apiBase}/api/videos/proxy-stream?uuid=${uuid}`,
        ];

        for (const proxyUrl of proxyUrls) {
          try {
            const proxyHeaders: Record<string, string> = { "Cache-Control": "no-cache" };
            if (reqRange) proxyHeaders["Range"] = reqRange;

            const proxyRes = await fetch(proxyUrl, { headers: proxyHeaders, redirect: "follow" });
            if (proxyRes.ok || proxyRes.status === 206) {
              upstreamRes = proxyRes;
              workingLink = proxyUrl;
              break;
            } else {
              failedStatuses[`[RenderProxy] ${proxyUrl}`] = proxyRes.status;
            }
          } catch (e: any) {
            failedStatuses[`[RenderProxy] ${proxyUrl}`] = -1;
          }
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
              failedStatuses,
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
        // Direct MP4 / binary video stream pipe with Range & Partial Content support
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
      try {
        keyUrl = decodeURIComponent(target);
      } catch {}

      const { res: upstream } = await fetchUpstreamWithFallback(keyUrl, null);
      if (!upstream) {
        return new Response("Key fetch failed", { status: 502, headers: corsHeaders() });
      }

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
      const { res: upstream } = await fetchUpstreamWithFallback(segmentUrl, reqRange);

      if (!upstream) {
        return new Response("Segment fetch failed", { status: 502, headers: corsHeaders() });
      }

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
