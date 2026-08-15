export interface Env {
  API_BASE_URL: string;
  STREAM_SIGN_SECRET: string;
  // set true if you want to REQUIRE signed links only
  REQUIRE_SIGNED?: string;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}

const ORIGIN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://xhamster.com/",
  "Origin": "https://xhamster.com",
};

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
      const requireSigned = (env.REQUIRE_SIGNED || "").toLowerCase() === "true";

      const check = await verifySigned(uuid, exp, sig, env.STREAM_SIGN_SECRET, requireSigned);
      if (!check.ok) {
        return new Response(JSON.stringify({ error: check.error }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      // Fetch video metadata from API
      let metaRes = await fetch(`${env.API_BASE_URL}/api/videos/uuid/${uuid}`);
      if (!metaRes.ok) {
        return new Response(JSON.stringify({ error: "Video not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      let video = (await metaRes.json()) as {
        m3u8Links?: any;
        directVideoLinks?: any;
        status?: string;
      };

      if (video.status === "dead") {
        return new Response(JSON.stringify({ error: "Stream unavailable" }), {
          status: 410,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      const collectCandidateLinks = (vData: any): string[] => {
        const links: string[] = [];
        let m3u8List = vData.m3u8Links;
        if (typeof m3u8List === "string") {
          try { m3u8List = JSON.parse(m3u8List); } catch { m3u8List = [m3u8List]; }
        }
        if (Array.isArray(m3u8List)) {
          for (const item of m3u8List) {
            if (typeof item === "string" && item.trim()) links.push(item.trim());
            else if (item && typeof item === "object" && item.url) links.push(item.url);
          }
        }

        let directList = vData.directVideoLinks;
        if (typeof directList === "string") {
          try { directList = JSON.parse(directList); } catch { directList = [directList]; }
        }
        if (Array.isArray(directList)) {
          for (const item of directList) {
            if (typeof item === "string" && item.trim()) links.push(item.trim());
            else if (item && typeof item === "object" && item.url) links.push(item.url);
          }
        }
        return links;
      };

      let candidateLinks = collectCandidateLinks(video);

      // Try fetching candidate stream links
      let upstreamRes: Response | null = null;
      let workingLink = "";
      for (const link of candidateLinks) {
        try {
          const res = await fetch(link, {
            headers: {
              ...ORIGIN_HEADERS,
              Accept: "*/*",
            },
          });
          if (res.ok) {
            upstreamRes = res;
            workingLink = link;
            break;
          }
        } catch {}
      }

      // If all candidate links failed (expired tokens), trigger auto-refresh from API
      if (!upstreamRes) {
        try {
          const refreshRes = await fetch(`${env.API_BASE_URL}/api/videos/${uuid}/refresh`, {
            method: "POST",
          });
          if (refreshRes.ok) {
            const refreshedVideo = await refreshRes.json();
            const newLinks = collectCandidateLinks(refreshedVideo);
            for (const link of newLinks) {
              try {
                const res = await fetch(link, {
                  headers: {
                    ...ORIGIN_HEADERS,
                    Accept: "*/*",
                  },
                });
                if (res.ok) {
                  upstreamRes = res;
                  workingLink = link;
                  break;
                }
              } catch {}
            }
          }
        } catch {}
      }

      if (!upstreamRes) {
        return new Response(JSON.stringify({ error: "Upstream stream links expired and refresh failed" }), {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
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
        // Direct MP4 or video stream pipe
        const headers = new Headers(corsHeaders());
        headers.set("Content-Type", contentType || "video/mp4");
        headers.set("Cache-Control", "public, max-age=3600");
        return new Response(upstreamRes.body, { status: 200, headers });
      }
    }

    // GET /api/key?uuid=&u=&exp=&sig=
    if (url.pathname === "/api/key") {
      const uuid = url.searchParams.get("uuid") || "";
      const target = url.searchParams.get("u");
      const exp = url.searchParams.get("exp");
      const sig = url.searchParams.get("sig");
      const requireSigned = (env.REQUIRE_SIGNED || "").toLowerCase() === "true";

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
        headers: {
          ...ORIGIN_HEADERS,
          Accept: "*/*",
        },
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
      const requireSigned = (env.REQUIRE_SIGNED || "").toLowerCase() === "true";

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

      const upstream = await fetch(segmentUrl, {
        headers: {
          ...ORIGIN_HEADERS,
          Accept: "*/*",
        },
      });

      const headers = new Headers(corsHeaders());
      headers.set("Content-Type", upstream.headers.get("Content-Type") || "video/mp2t");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

      return new Response(upstream.body, { status: upstream.status, headers });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders() });
  },
};
