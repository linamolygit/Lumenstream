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
      const video = (await metaRes.json()) as { m3u8Links?: string[]; status?: string };
      if (video.status && video.status !== "active") {
        return new Response(JSON.stringify({ error: "Stream unavailable" }), {
          status: 410,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      const m3u8 = Array.isArray(video.m3u8Links) ? video.m3u8Links[0] : null;
      if (!m3u8) {
        return new Response(JSON.stringify({ error: "No stream" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      const upstream = await fetch(m3u8, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" },
      });
      if (!upstream.ok) {
        return new Response(JSON.stringify({ error: "Upstream failed" }), {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      const text = await upstream.text();
      // preserve signed query on segment rewrites
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
