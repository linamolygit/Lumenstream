import json
import re
import os
from datetime import datetime
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests
import yt_dlp


class UniversalVideoExtractor:
    def __init__(self, impersonate: str = "chrome120"):
        self.impersonate = impersonate
        self.session = cffi_requests.Session()
        self.json_file = "extracted_data.json"
        self.html_file = "report.html"

    def fetch(self, url: str) -> str | None:
        try:
            r = self.session.get(
                url,
                impersonate=self.impersonate,
                timeout=25,
                headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Referer": url,
                }
            )
            r.raise_for_status()
            return r.text
        except Exception as e:
            print(f"[Error] Fetch failed → {url} | {e}")
            return None

    def _clean_list(self, lst):
        return list(dict.fromkeys([x.strip() for x in lst if x and isinstance(x, str)]))

    def _new_data_template(self, page_url: str = None) -> dict:
        return {
            "title": None,
            "video_page_url": page_url,
            "duration": None,
            "views": None,
            "channel": None,
            "channel_url": None,
            "channel_logo": None,
            "thumbnails": [],
            "sprite": None,
            "preview_videos": [],
            "m3u8_links": [],
            "direct_video_links": [],
            "description": None,
            "yt_dlp_info": None,
            "extracted_at": datetime.now().isoformat(),
            "source_site": urlparse(page_url).netloc if page_url else None
        }

    # ==================== GENERIC SINGLE PAGE ====================
    def extract_single_page(self, html: str, page_url: str) -> dict:
        soup = BeautifulSoup(html, "lxml")
        data = self._new_data_template(page_url)

        # Title
        title = (
            soup.select_one('meta[property="og:title"]') or
            soup.select_one('meta[name="twitter:title"]') or
            soup.select_one("h1") or
            soup.select_one("title")
        )
        if title:
            data["title"] = (title.get("content") or title.get_text(strip=True) or "").strip()

        # Description
        desc = soup.select_one('meta[property="og:description"]') or soup.select_one('meta[name="description"]')
        if desc:
            data["description"] = desc.get("content", "").strip()

        # Thumbnails
        for meta in soup.select('meta[property="og:image"], meta[name="twitter:image"]'):
            if meta.get("content"):
                data["thumbnails"].append(meta["content"])

        for img in soup.select("img[src]"):
            src = img.get("src", "")
            if any(x in src.lower() for x in [".jpg", ".jpeg", ".webp", ".png"]) and \
               not any(x in src.lower() for x in ["logo", "avatar", "icon", "flag"]):
                data["thumbnails"].append(urljoin(page_url, src))
        data["thumbnails"] = self._clean_list(data["thumbnails"])

        # Sprite (single page)
        sprite = soup.select_one("[data-sprite]")
        if sprite and sprite.get("data-sprite"):
            data["sprite"] = sprite.get("data-sprite")

        # Preview videos (single page)
        for attr in ["data-previewvideo", "data-previewvideo-fallback", "data-preview"]:
            for el in soup.select(f"[{attr}]"):
                val = el.get(attr)
                if val and any(ext in val.lower() for ext in [".mp4", ".webm", ".mov"]):
                    data["preview_videos"].append(urljoin(page_url, val))
        data["preview_videos"] = self._clean_list(data["preview_videos"])

        # Channel
        for sel in [".video-uploader__name", ".uploader a", ".author a", ".channel-name",
                    "a[href*='/channel']", "a[href*='/channels/']", "a[href*='/user/']"]:
            ch = soup.select_one(sel)
            if ch and ch.get_text(strip=True):
                data["channel"] = ch.get_text(strip=True)
                if ch.get("href"):
                    data["channel_url"] = urljoin(page_url, ch.get("href"))
                break

        # Duration & Views
        for sel in [".duration", "[class*='duration']", "time", "[data-duration]"]:
            el = soup.select_one(sel)
            if el:
                data["duration"] = el.get_text(strip=True) or el.get("data-duration")
                break

        for sel in [".views", "[class*='views']", ".video-views"]:
            el = soup.select_one(sel)
            if el:
                data["views"] = el.get_text(strip=True)
                break

        # Regex fallback
        data["m3u8_links"].extend(re.findall(r'https?://[^\s"\'<>]+?\.m3u8[^\s"\'<>]*', html))
        data["direct_video_links"].extend(re.findall(
            r'https?://[^\s"\'<>]+?(?:\.mp4|\.m3u8|media=hls|_TPL_\.av1\.mp4)[^\s"\'<>]*', html
        ))
        data["m3u8_links"] = self._clean_list(data["m3u8_links"])
        data["direct_video_links"] = self._clean_list(data["direct_video_links"])
        return data

    # ==================== LISTING PAGE (Fixed Preview + Sprite) ====================
    def extract_listing(self, html: str, base_url: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")

        # Different possible containers
        items = soup.select(
            'div.video-thumb, div.thumb-list__item, div[data-video-id], '
            'div.video-thumb--type-video, div[data-role="related-item"], '
            'div.thumb, div.video-item, article.video, .video-card, .thumb-block'
        )

        results = []
        for item in items:
            data = self._new_data_template()

            # --- Title + Video URL ---
            link = item.select_one(
                'a[data-role="thumb-link"], a.video-thumb-info__name, '
                'a.thumb-image-container, a[href*="/video"], a[href*="/videos/"], a'
            )
            if link and link.get("href"):
                href = link.get("href")
                data["video_page_url"] = urljoin(base_url, href)
                data["title"] = (
                    link.get("title") or 
                    link.get("aria-label") or 
                    link.get_text(strip=True) or 
                    ""
                ).strip()

            # --- Thumbnails ---
            for img in item.select("img[src], img[data-src], img[data-original]"):
                src = img.get("src") or img.get("data-src") or img.get("data-original") or ""
                if src and not any(x in src.lower() for x in ["logo", "avatar", "icon"]):
                    data["thumbnails"].append(urljoin(base_url, src))
            data["thumbnails"] = self._clean_list(data["thumbnails"])

            # --- Sprite (IMPORTANT: only from current item) ---
            sprite_el = item.select_one("[data-sprite]")
            if sprite_el and sprite_el.get("data-sprite"):
                data["sprite"] = sprite_el.get("data-sprite")

            # --- Preview Videos (FIXED: only from current item) ---
            preview_attrs = [
                "data-previewvideo", 
                "data-previewvideo-fallback", 
                "data-preview", 
                "data-src-preview"
            ]
            for attr in preview_attrs:
                el = item.select_one(f"[{attr}]")
                if el and el.get(attr):
                    val = el.get(attr)
                    if any(ext in val.lower() for ext in [".mp4", ".webm", ".mov", "preview"]):
                        data["preview_videos"].append(urljoin(base_url, val))
            data["preview_videos"] = self._clean_list(data["preview_videos"])

            # --- Duration ---
            dur = item.select_one(
                '[data-role="video-duration"], .thumb-image-container__duration, '
                '.duration, [class*="duration"]'
            )
            if dur:
                data["duration"] = dur.get_text(strip=True)

            # --- Views ---
            views = item.select_one('.video-thumb-views, .views, [class*="views"]')
            if views:
                data["views"] = views.get_text(strip=True)

            # --- Channel ---
            ch = item.select_one(
                'a.video-uploader__name, a[data-role="video-uploader-link"], '
                '.uploader a, .channel a, .author a'
            )
            if ch:
                data["channel"] = ch.get_text(strip=True)
                if ch.get("href"):
                    data["channel_url"] = urljoin(base_url, ch.get("href"))

            # --- Channel Logo ---
            logo = item.select_one('a.video-uploader-logo, [data-background-image]')
            if logo:
                bg = logo.get("data-background-image") or logo.get("style", "")
                m = re.search(r'url\(["\']?(https?://[^"\')\s]+)', str(bg))
                if m:
                    data["channel_logo"] = m.group(1)

            if data["video_page_url"] or data["title"]:
                results.append(data)

        return results

    # ==================== yt-dlp ====================
    def get_yt_dlp_info(self, video_url: str, download: bool = False, output_dir: str = "downloads") -> dict:
        os.makedirs(output_dir, exist_ok=True)

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": not download,
            "outtmpl": os.path.join(output_dir, "%(title).80s [%(id)s].%(ext)s"),
            "format": "bestvideo+bestaudio/best",
            "merge_output_format": "mp4",
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": video_url,
            },
            "retries": 3,
        }

        info = {
            "title": None,
            "duration": None,
            "view_count": None,
            "uploader": None,
            "formats": [],
            "m3u8_urls": [],
            "direct_urls": [],
            "best_url": None,
            "downloaded": False,
            "error": None
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(video_url, download=download)

                info["title"] = result.get("title")
                info["duration"] = result.get("duration")
                info["view_count"] = result.get("view_count")
                info["uploader"] = result.get("uploader") or result.get("channel")
                info["best_url"] = result.get("url")

                for f in result.get("formats", []):
                    url = f.get("url")
                    if not url:
                        continue
                    protocol = str(f.get("protocol", "")).lower()
                    ext = str(f.get("ext", "")).lower()

                    if "m3u8" in protocol or url.endswith(".m3u8"):
                        info["m3u8_urls"].append(url)
                    elif ext in ["mp4", "webm"] or "http" in protocol:
                        info["direct_urls"].append(url)

                info["m3u8_urls"] = self._clean_list(info["m3u8_urls"])
                info["direct_urls"] = self._clean_list(info["direct_urls"])

                if download:
                    info["downloaded"] = True

        except Exception as e:
            info["error"] = str(e)
            print(f"    [yt-dlp Error] {e}")

        return info

    # ==================== PROCESS ====================
    def process(self, url: str, max_videos: int = 15, use_ytdlp: bool = True, download: bool = False):
        html = self.fetch(url)
        if not html:
            return []

        path = urlparse(url).path.lower()
        is_single = any(x in path for x in ["/video/", "/videos/", "/v/", "/watch"]) and path.count("/") >= 2

        if is_single:
            print(f"[*] Single video page → {url}")
            data = self.extract_single_page(html, url)
            results = [data]
        else:
            print(f"[*] Listing page → extracting cards...")
            results = self.extract_listing(html, url)[:max_videos]
            print(f"[*] Found {len(results)} videos")

        if use_ytdlp and results:
            print(f"[*] Extracting streams with yt-dlp...")
            for item in results:
                vurl = item.get("video_page_url") or url
                if not vurl:
                    continue
                print(f"    → {vurl}")
                yinfo = self.get_yt_dlp_info(vurl, download=download)
                item["yt_dlp_info"] = yinfo

                if yinfo.get("m3u8_urls"):
                    item["m3u8_links"] = self._clean_list(item.get("m3u8_links", []) + yinfo["m3u8_urls"])
                if yinfo.get("direct_urls"):
                    item["direct_video_links"] = self._clean_list(item.get("direct_video_links", []) + yinfo["direct_urls"])
                if yinfo.get("best_url"):
                    item["direct_video_links"] = self._clean_list(item.get("direct_video_links", []) + [yinfo["best_url"]])

                # Fill missing info
                if not item.get("title") and yinfo.get("title"):
                    item["title"] = yinfo["title"]
                if not item.get("duration") and yinfo.get("duration"):
                    item["duration"] = str(yinfo["duration"])
                if not item.get("views") and yinfo.get("view_count"):
                    item["views"] = str(yinfo["view_count"])
                if not item.get("channel") and yinfo.get("uploader"):
                    item["channel"] = yinfo["uploader"]

        return results

    # ==================== SAVE ====================
    def load_existing(self) -> list:
        if os.path.exists(self.json_file):
            try:
                with open(self.json_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except:
                return []
        return []

    def save_json(self, new_data: list):
        existing = self.load_existing()
        existing_urls = {item.get("video_page_url") for item in existing if item.get("video_page_url")}

        added = 0
        for item in new_data:
            url = item.get("video_page_url")
            if url and url not in existing_urls:
                existing.append(item)
                existing_urls.add(url)
                added += 1
            elif not url:
                existing.append(item)
                added += 1

        with open(self.json_file, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)
        print(f"[+] JSON updated → {self.json_file} | Added: {added} | Total: {len(existing)}")

    def save_html_report(self):
        all_data = self.load_existing()

        rows = []
        for i, v in enumerate(all_data, 1):
            yinfo = v.get("yt_dlp_info") or {}
            m3u8s = v.get("m3u8_links") or yinfo.get("m3u8_urls") or []
            directs = v.get("direct_video_links") or []
            previews = v.get("preview_videos") or []
            sprite = v.get("sprite")

            thumbs = "".join(
                f'<img src="{t}" height="55" style="margin:2px;border-radius:4px">'
                for t in (v.get("thumbnails") or [])[:2]
            )

            # Sprite display
            sprite_html = f'<a href="{sprite}" target="_blank">Sprite Link</a><br><img src="{sprite}" height="40" style="margin-top:4px;border-radius:3px">' if sprite else "<span style='color:#777'>-</span>"

            # Preview videos
            preview_html = "<br>".join([f'<a href="{p}" target="_blank">Preview {i+1}</a>' for i, p in enumerate(previews[:2])]) if previews else "<span style='color:#777'>-</span>"

            m3u8_html = "<br>".join(m3u8s[:3]) if m3u8s else "<span style='color:#777'>No m3u8</span>"
            direct_html = "<br>".join(directs[:2]) if directs else "<span style='color:#777'>-</span>"

            rows.append(f"""
            <tr>
                <td>{i}</td>
                <td>
                    <strong>{v.get('title') or yinfo.get('title') or 'N/A'}</strong><br>
                    <a href="{v.get('video_page_url')}" target="_blank">Open Page</a><br>
                    <small style="color:#888">{v.get('source_site')}</small>
                </td>
                <td>{v.get('duration') or yinfo.get('duration') or '-'}</td>
                <td>{v.get('views') or yinfo.get('view_count') or '-'}</td>
                <td>{v.get('channel') or yinfo.get('uploader') or '-'}</td>
                <td>{thumbs}</td>
                <td style="font-size:12px;">{sprite_html}</td>
                <td style="font-size:11px;word-break:break-all;">{preview_html}</td>
                <td style="font-size:11px;word-break:break-all;max-width:240px">{m3u8_html}</td>
                <td style="font-size:11px;word-break:break-all;max-width:200px">{direct_html}</td>
            </tr>
            """)

        html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Universal Video Extract Report</title>
<style>
    body {{ font-family: system-ui, sans-serif; background: #0f0f0f; color: #eee; margin: 20px; }}
    table {{ border-collapse: collapse; width: 100%; font-size: 13px; }}
    th, td {{ border: 1px solid #333; padding: 7px; vertical-align: top; }}
    th {{ background: #1a1a1a; position: sticky; top: 0; }}
    a {{ color: #6af; }}
    tr:hover {{ background: #181818; }}
</style>
</head>
<body>
<h1>Universal Video Extract Report</h1>
<p>Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Total Videos: {len(all_data)}</p>
<table>
<thead>
<tr>
    <th>#</th>
    <th>Title / Page</th>
    <th>Duration</th>
    <th>Views</th>
    <th>Channel</th>
    <th>Thumbnails</th>
    <th>Sprite Image</th>
    <th>Preview Videos (MP4)</th>
    <th>m3u8 Streams</th>
    <th>Direct MP4</th>
</tr>
</thead>
<tbody>
{''.join(rows)}
</tbody>
</table>
</body>
</html>"""

        with open(self.html_file, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"[+] HTML Report updated → {self.html_file}")


# ====================== MAIN ======================
if __name__ == "__main__":
    extractor = UniversalVideoExtractor(impersonate="chrome120")

    print("=" * 60)
    print("  Universal Video Extractor (Fixed Preview + Sprite)")
    print("=" * 60)

    url = input("\nEnter URL: ").strip()
    if not url:
        print("No URL given.")
        exit()

    max_v = input("Max videos from listing (default 12): ").strip()
    max_v = int(max_v) if max_v.isdigit() else 12

    use_ytdlp = input("Use yt-dlp for streams? (y/n, default y): ").strip().lower() != "n"
    do_download = input("Also download videos? (y/n, default n): ").strip().lower() == "y"

    print("\n[*] Starting extraction...\n")
    results = extractor.process(url, max_videos=max_v, use_ytdlp=use_ytdlp, download=do_download)

    if results:
        extractor.save_json(results)
        extractor.save_html_report()
        print(f"\n[✓] Done! Processed {len(results)} items.")
    else:
        print("[!] No data extracted.")