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
  // If signed params missing
  if (!exp && !sig) {
    if (requireSigned) return { ok: false, error: "Signed link required" };
    return { ok: true }; // allow open uuid links
  }

  if (!exp || !sig) return { ok: false, error: "Invalid signature params" };

  const expNum = Number(exp);
  if (!Number.isFinite(expNum)) return { ok: false, error: "Invalid exp" };
  if (Math.floor(Date.now() / 1000) > expNum) {
    return { ok: false, error: "Link expired" };
  }

  const expectedFull = await hmacHex(secret, `${uuid}:${exp}`);
  const expected = expectedFull.slice(0, 32);

  // constant-time-ish compare
  if (expected.length !== sig.length) return { ok: false, error: "Invalid signature" };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  if (diff !== 0) return { ok: false, error: "Invalid signature" };

  return { ok: true };
}

function rewriteM3u8(body: string, workerOrigin: string, uuid: string, search: string): string {
  // Keep exp/sig on segment requests if present
  const q = search.startsWith("?") ? search : search ? `?${search}` : "";
  return body
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return line;
      // absolute or relative segment URL → proxy through worker
      const encoded = encodeURIComponent(t);
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
      const metaRes = await fetch(`${env.API_BASE_URL}/api/videos/uuid/${uuid}`);
      if (!metaRes.ok) {
        return new Response(JSON.stringify({ error: "Video not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }
      const video = (await metaRes.json()) as {
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

      // Collect all candidate stream URLs from m3u8Links and directVideoLinks
      const candidateLinks: string[] = [];

      let m3u8List = video.m3u8Links;
      if (typeof m3u8List === "string") {
        try { m3u8List = JSON.parse(m3u8List); } catch { m3u8List = [m3u8List]; }
      }
      if (Array.isArray(m3u8List)) {
        for (const item of m3u8List) {
          if (typeof item === "string" && item.trim()) candidateLinks.push(item.trim());
          else if (item && typeof item === "object" && item.url) candidateLinks.push(item.url);
        }
      }

      let directList = video.directVideoLinks;
      if (typeof directList === "string") {
        try { directList = JSON.parse(directList); } catch { directList = [directList]; }
      }
      if (Array.isArray(directList)) {
        for (const item of directList) {
          if (typeof item === "string" && item.trim()) candidateLinks.push(item.trim());
          else if (item && typeof item === "object" && item.url) candidateLinks.push(item.url);
        }
      }

      if (!candidateLinks.length) {
        return new Response(JSON.stringify({ error: "No stream URLs available" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      // Try fetching candidate links until one succeeds
      let upstreamRes: Response | null = null;
      let workingLink = "";
      for (const link of candidateLinks) {
        try {
          const res = await fetch(link, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

      if (!upstreamRes) {
        return new Response(JSON.stringify({ error: "Upstream stream links failed" }), {
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

        const rewritten = rewriteM3u8(text, url.origin, uuid, qs);

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
        headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" },
      });

      const headers = new Headers(corsHeaders());
      headers.set("Content-Type", upstream.headers.get("Content-Type") || "video/mp2t");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

      return new Response(upstream.body, { status: upstream.status, headers });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders() });
  },
};
