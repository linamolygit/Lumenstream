import json
import re
import os
from datetime import datetime
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests
import yt_dlp


class AdvancedXHExtractor:
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
                    "Referer": "https://newxh.life/",
                }
            )
            r.raise_for_status()
            return r.text
        except Exception as e:
            print(f"[Error] Fetch failed → {url} | {e}")
            return None

    def _clean_list(self, lst):
        return list(dict.fromkeys([x for x in lst if x]))

    # ==================== THUMB ITEM EXTRACTION ====================
    def extract_from_thumb_item(self, item, base_url: str) -> dict:
        data = {
            "title": None,
            "video_page_url": None,
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
            "extracted_at": datetime.now().isoformat()
        }

        # Title + Video URL
        link = item.select_one('a[data-role="thumb-link"], a.video-thumb-info__name, a.thumb-image-container')
        if link:
            href = link.get("href")
            if href:
                data["video_page_url"] = urljoin(base_url, href)
            data["title"] = (link.get("title") or link.get("aria-label") or link.get_text(strip=True) or "").strip()

        # Duration
        dur = item.select_one('[data-role="video-duration"], .thumb-image-container__duration, .duration')
        if dur:
            data["duration"] = dur.get_text(strip=True)

        # Views
        views = item.select_one('.video-thumb-views, .views')
        if views:
            data["views"] = views.get_text(strip=True)

        # Channel
        ch = item.select_one('a.video-uploader__name, a[data-role="video-uploader-link"]')
        if ch:
            data["channel"] = ch.get_text(strip=True)
            href = ch.get("href")
            if href:
                data["channel_url"] = urljoin(base_url, href)

        # Channel Logo
        logo = item.select_one('a.video-uploader-logo, [data-background-image]')
        if logo:
            bg = logo.get("data-background-image") or logo.get("style", "")
            m = re.search(r'url\(["\']?(https?://[^"\')\s]+)', str(bg))
            if m:
                data["channel_logo"] = m.group(1)
            elif logo.get("src"):
                data["channel_logo"] = logo["src"]

        # Thumbnails
        for img in item.select('img'):
            src = img.get("src") or ""
            srcset = img.get("srcset") or ""
            if ".webp" in src and "logo" not in src.lower():
                data["thumbnails"].append(src)
            if srcset:
                for part in srcset.split(","):
                    u = part.strip().split(" ")[0]
                    if ".webp" in u:
                        data["thumbnails"].append(u)
        data["thumbnails"] = self._clean_list(data["thumbnails"])

        # Sprite
        sprite = item.select_one("[data-sprite]")
        if sprite and sprite.get("data-sprite"):
            data["sprite"] = sprite["data-sprite"]

        # Preview videos
        for attr in ["data-previewvideo", "data-previewvideo-fallback"]:
            el = item.select_one(f"[{attr}]")
            if el and el.get(attr):
                data["preview_videos"].append(el[attr])
        data["preview_videos"] = self._clean_list(data["preview_videos"])

        return data

    def extract_listing(self, html: str, base_url: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        items = soup.select(
            'div.video-thumb, div.thumb-list__item, div[data-video-id], '
            'div.video-thumb--type-video, div[data-role="related-item"]'
        )
        results = []
        for item in items:
            d = self.extract_from_thumb_item(item, base_url)
            if d["video_page_url"] or d["title"]:
                results.append(d)
        return results

    # ==================== SINGLE VIDEO PAGE ====================
    def extract_single_page(self, html: str, page_url: str) -> dict:
        soup = BeautifulSoup(html, "lxml")
        data = {
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
            "extracted_at": datetime.now().isoformat()
        }

        # Title
        t = (soup.select_one("h1") or 
             soup.select_one('meta[property="og:title"]') or 
             soup.select_one("title"))
        if t:
            data["title"] = (t.get("content") or t.get_text(strip=True) or "").strip()

        # Description
        desc = soup.select_one('meta[property="og:description"], meta[name="description"]')
        if desc:
            data["description"] = desc.get("content", "").strip()

        # Thumbnails
        for meta in soup.select('meta[property="og:image"], meta[name="twitter:image"]'):
            if meta.get("content"):
                data["thumbnails"].append(meta["content"])
        for img in soup.select('img[src*=".webp"], img[src*="thumb"]'):
            src = img.get("src", "")
            if src and "logo" not in src.lower() and "avatar" not in src.lower():
                data["thumbnails"].append(src)
        data["thumbnails"] = self._clean_list(data["thumbnails"])

        # Sprite
        sprite = soup.select_one("[data-sprite]")
        if sprite:
            data["sprite"] = sprite.get("data-sprite")

        # Preview videos
        for attr in ["data-previewvideo", "data-previewvideo-fallback"]:
            el = soup.select_one(f"[{attr}]")
            if el and el.get(attr):
                data["preview_videos"].append(el.get(attr))
        data["preview_videos"] = self._clean_list(data["preview_videos"])

        # Channel
        ch = soup.select_one(".video-uploader__name, a[href*='/channels/'], .uploader a")
        if ch:
            data["channel"] = ch.get_text(strip=True)
            href = ch.get("href")
            if href:
                data["channel_url"] = urljoin(page_url, href)

        # Channel Logo
        logo = soup.select_one('a.video-uploader-logo, .channel-logo img, [data-background-image]')
        if logo:
            bg = logo.get("data-background-image") or logo.get("style", "")
            m = re.search(r'url\(["\']?(https?://[^"\')\s]+)', str(bg))
            if m:
                data["channel_logo"] = m.group(1)
            elif logo.get("src"):
                data["channel_logo"] = logo["src"]

        # Duration & Views (common selectors)
        dur = soup.select_one('[data-role="video-duration"], .duration, time')
        if dur:
            data["duration"] = dur.get_text(strip=True)

        views = soup.select_one('.views, .video-views, [class*="views"]')
        if views:
            data["views"] = views.get_text(strip=True)

        # Best-effort m3u8 + direct links from scripts
        for script in soup.find_all("script"):
            txt = script.string or script.get_text() or ""
            # m3u8
            data["m3u8_links"].extend(re.findall(r'https?://[^\s"\'<>]+?\.m3u8[^\s"\'<>]*', txt))
            # direct mp4 / av1 style
            data["direct_video_links"].extend(re.findall(
                r'https?://video[^"\'\s]+?(?:\.mp4|_TPL_\.av1\.mp4|media=hls[^"\'\s]+)', txt
            ))

        data["m3u8_links"] = self._clean_list(data["m3u8_links"])
        data["direct_video_links"] = self._clean_list(data["direct_video_links"])
        return data

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
                "Referer": "https://newxh.life/",
            },
        }

        info = {
            "title": None,
            "duration": None,
            "view_count": None,
            "uploader": None,
            "formats": [],
            "m3u8_urls": [],
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
                    fmt = {
                        "format_id": f.get("format_id"),
                        "ext": f.get("ext"),
                        "resolution": f.get("resolution") or f.get("format_note"),
                        "height": f.get("height"),
                        "url": url,
                        "protocol": f.get("protocol"),
                    }
                    info["formats"].append(fmt)
                    if "m3u8" in str(f.get("protocol", "")).lower() or ".m3u8" in url:
                        info["m3u8_urls"].append(url)

                if download:
                    info["downloaded"] = True

        except Exception as e:
            info["error"] = str(e)

        return info

    # ==================== PROCESS ====================
    def process(self, url: str, max_videos: int = 20, use_ytdlp: bool = True, download: bool = False):
        html = self.fetch(url)
        if not html:
            return []

        parsed = urlparse(url)
        is_video_page = "/videos/" in parsed.path and not parsed.path.endswith("/videos/")

        if is_video_page:
            print(f"[*] Single video page → {url}")
            data = self.extract_single_page(html, url)
            results = [data]
        else:
            print(f"[*] Listing / Domain page → extracting cards...")
            results = self.extract_listing(html, url)[:max_videos]
            print(f"[*] Found {len(results)} videos on page")

        if use_ytdlp and results:
            print(f"[*] Enriching with yt-dlp...")
            for item in results:
                vurl = item.get("video_page_url")
                if not vurl:
                    continue
                print(f"    → {vurl}")
                yinfo = self.get_yt_dlp_info(vurl, download=download)
                item["yt_dlp_info"] = yinfo

                # Merge streams
                if yinfo.get("m3u8_urls"):
                    item["m3u8_links"] = self._clean_list(item["m3u8_links"] + yinfo["m3u8_urls"])
                if yinfo.get("best_url"):
                    item["direct_video_links"] = self._clean_list(
                        item["direct_video_links"] + [yinfo["best_url"]]
                    )

                # Fill missing metadata from yt-dlp
                if not item["title"] and yinfo.get("title"):
                    item["title"] = yinfo["title"]
                if not item["duration"] and yinfo.get("duration"):
                    item["duration"] = str(yinfo["duration"])
                if not item["views"] and yinfo.get("view_count"):
                    item["views"] = str(yinfo["view_count"])
                if not item["channel"] and yinfo.get("uploader"):
                    item["channel"] = yinfo["uploader"]

        return results

    # ==================== SAVE (APPEND MODE) ====================
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

        with open(self.json_file, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)

        print(f"[+] JSON updated → {self.json_file} | Added: {added} | Total: {len(existing)}")

    def save_html_report(self, new_data: list):
        # Always rebuild full report from JSON (safest + clean)
        all_data = self.load_existing()

        rows = []
        for i, v in enumerate(all_data, 1):
            yinfo = v.get("yt_dlp_info") or {}
            m3u8s = v.get("m3u8_links") or yinfo.get("m3u8_urls") or []
            thumbs = "".join(
                f'<img src="{t}" height="65" style="margin:2px;border-radius:4px">'
                for t in (v.get("thumbnails") or [])[:2]
            )
            sprite = f'<br><small>Sprite: {v.get("sprite")}</small>' if v.get("sprite") else ""

            rows.append(f"""
            <tr>
                <td>{i}</td>
                <td>
                    <strong>{v.get('title') or yinfo.get('title') or 'N/A'}</strong><br>
                    <a href="{v.get('video_page_url')}" target="_blank">Open Page</a>
                    {sprite}
                </td>
                <td>{v.get('duration') or yinfo.get('duration') or '-'}</td>
                <td>{v.get('views') or yinfo.get('view_count') or '-'}</td>
                <td>{v.get('channel') or yinfo.get('uploader') or '-'}</td>
                <td>{thumbs}</td>
                <td style="font-size:11px;word-break:break-all;max-width:320px">
                    {('<br>'.join(m3u8s[:4]) if m3u8s else '<span style="color:#888">No m3u8</span>')}
                </td>
            </tr>
            """)

        html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>XH Extract Report</title>
<style>
    body {{ font-family: system-ui, sans-serif; background: #0f0f0f; color: #eee; margin: 20px; }}
    table {{ border-collapse: collapse; width: 100%; }}
    th, td {{ border: 1px solid #333; padding: 8px; vertical-align: top; }}
    th {{ background: #1a1a1a; position: sticky; top: 0; }}
    a {{ color: #6af; }}
    tr:hover {{ background: #1a1a1a; }}
</style>
</head>
<body>
<h1>Extracted Report</h1>
<p>Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Total Videos: {len(all_data)}</p>
<table>
<thead>
<tr>
    <th>#</th>
    <th>Title / Link</th>
    <th>Duration</th>
    <th>Views</th>
    <th>Channel</th>
    <th>Thumbnails</th>
    <th>m3u8 Streams</th>
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
    extractor = AdvancedXHExtractor(impersonate="chrome120")

    print("=" * 55)
    print(" Advanced XH Extractor (Append Mode)")
    print("=" * 55)

    url = input("\nEnter URL (video / listing / domain): ").strip()
    if not url:
        print("No URL given. Exiting.")
        exit()

    max_v = input("Max videos from listing (default 15): ").strip()
    max_v = int(max_v) if max_v.isdigit() else 15

    use_ytdlp = input("Use yt-dlp for streams? (y/n, default y): ").strip().lower() != "n"
    do_download = input("Also download videos? (y/n, default n): ").strip().lower() == "y"

    print("\n[*] Starting extraction...\n")
    results = extractor.process(
        url,
        max_videos=max_v,
        use_ytdlp=use_ytdlp,
        download=do_download
    )

    if results:
        extractor.save_json(results)
        extractor.save_html_report(results)
        print(f"\n[✓] Done! Processed {len(results)} items.")
        print(f"    → Data saved in: {extractor.json_file}")
        print(f"    → Report saved in: {extractor.html_file}")
    else:
        print("[!] No data extracted.")