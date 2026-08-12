declare const API_BASE: string;
const apiBase = typeof API_BASE !== "undefined" ? API_BASE : "https://api.localhost";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const uuid = url.searchParams.get("uuid");
  if (!uuid) {
    return new Response(JSON.stringify({ error: "Missing uuid" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (url.pathname.endsWith(".m3u8") || url.pathname.endsWith(".ts")) {
    return await proxyMedia(request);
  }

  return await proxyPlaylist(request, uuid);
}

async function proxyPlaylist(request: Request, uuid: string): Promise<Response> {
  const metadataRes = await fetch(`${API_BASE}/api/stream/metadata/${uuid}`);
  if (!metadataRes.ok) {
    return new Response(JSON.stringify({ error: "Video metadata unavailable" }), { status: metadataRes.status, headers: { "Content-Type": "application/json" } });
  }

  const metadata = await metadataRes.json();
  const playlistUrl = metadata.m3u8Links?.[0];
  if (!playlistUrl) {
    return new Response(JSON.stringify({ error: "No playlist link" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  const playlistRes = await fetch(playlistUrl, { headers: { "Referer": metadata.sourcePageUrl || "" } });
  if (!playlistRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to fetch playlist" }), { status: 502, headers: { "Content-Type": "application/json" } });
  }

  const playlistText = await playlistRes.text();
  const rewritten = rewritePlaylist(playlistText, playlistUrl, uuid);
  return new Response(rewritten, { status: 200, headers: { "Content-Type": "application/vnd.apple.mpegurl" } });
}

async function proxyMedia(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const targetUrl = url.searchParams.get("target") || "";
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing target media URL" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const mediaRes = await fetch(targetUrl, { headers: { "Referer": request.headers.get("Referer") ?? "" } });
  const headers = new Headers(mediaRes.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(mediaRes.body, { status: mediaRes.status, headers });
}

function rewritePlaylist(playlist: string, baseUrl: string, uuid: string): string {
  const lines = playlist.split("\n");
  const rewritten = lines.map((line) => {
    if (line.startsWith("#")) {
      return line;
    }

    const targetUrl = new URL(line, baseUrl).toString();
    return `/api/media/segment?uuid=${uuid}&target=${encodeURIComponent(targetUrl)}`;
  });
  return rewritten.join("\n");
}
