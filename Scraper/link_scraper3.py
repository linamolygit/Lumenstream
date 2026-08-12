import json
import re
import os
import time
import random
from datetime import datetime
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests
import yt_dlp

try:
    import cloudscraper
    HAS_CLOUDSCRAPER = True
except ImportError:
    HAS_CLOUDSCRAPER = False

try:
    from fake_useragent import UserAgent
    ua = UserAgent()
except:
    ua = None


class UniversalVideoExtractor:
    def __init__(self):
        self.json_file = "extracted_data.json"
        self.html_file = "report.html"
        self.session = cffi_requests.Session()
        self.impersonate_list = ["chrome120", "chrome110", "chrome107", "safari17_0", "safari15_5"]

    def get_headers(self, url: str) -> dict:
        user_agent = ua.random if ua else "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        return {
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": url,
            "Origin": f"{urlparse(url).scheme}://{urlparse(url).netloc}",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
        }

    def fetch(self, url: str) -> str | None:
        """Human-like fetch with multiple fallbacks"""
        print(f"[*] Fetching → {url}")

        # Method 1: curl_cffi with different impersonations
        for impersonate in self.impersonate_list:
            try:
                r = self.session.get(
                    url,
                    impersonate=impersonate,
                    timeout=30,
                    headers=self.get_headers(url),
                    allow_redirects=True,
                )
                if r.status_code == 200 and len(r.text) > 2000:
                    print(f"    ✓ Success with {impersonate}")
                    return r.text
                else:
                    print(f"    ✗ {impersonate} → Status {r.status_code}")
            except Exception as e:
                print(f"    ✗ {impersonate} failed: {str(e)[:80]}")

            time.sleep(random.uniform(1.0, 2.5))

        # Method 2: cloudscraper (good against Cloudflare)
        if HAS_CLOUDSCRAPER:
            try:
                print("    → Trying cloudscraper...")
                scraper = cloudscraper.create_scraper(
                    browser={'browser': 'chrome', 'platform': 'windows', 'mobile': False}
                )
                r = scraper.get(url, timeout=30, headers=self.get_headers(url))
                if r.status_code == 200 and len(r.text) > 2000:
                    print("    ✓ Success with cloudscraper")
                    return r.text
            except Exception as e:
                print(f"    ✗ cloudscraper failed: {str(e)[:80]}")

        print("    ✗ All fetch methods failed")
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

    def extract_single_page(self, html: str, page_url: str) -> dict:
        soup = BeautifulSoup(html, "lxml")
        data = self._new_data_template(page_url)

        # Title
        for selector in [
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
            "h1",
            "title"
        ]:
            el = soup.select_one(selector)
            if el:
                data["title"] = (el.get("content") or el.get_text(strip=True) or "").strip()
                if data["title"]:
                    break

        # Description
        desc = soup.select_one('meta[property="og:description"]') or soup.select_one('meta[name="description"]')
        if desc:
            data["description"] = desc.get("content", "").strip()

        # Thumbnails
        for meta in soup.select('meta[property="og:image"], meta[name="twitter:image"]'):
            if meta.get("content"):
                data["thumbnails"].append(meta["content"])

        for img in soup.select("img[src], img[data-src], img[data-lazy-src]"):
            src = img.get("src") or img.get("data-src") or img.get("data-lazy-src") or ""
            if src and any(ext in src.lower() for ext in [".jpg", ".jpeg", ".webp", ".png"]):
                if not any(bad in src.lower() for bad in ["logo", "avatar", "icon", "flag", "emoji"]):
                    data["thumbnails"].append(urljoin(page_url, src))
        data["thumbnails"] = self._clean_list(data["thumbnails"])

        # Sprite
        sprite = soup.select_one("[data-sprite], [data-preview]")
        if sprite:
            data["sprite"] = sprite.get("data-sprite") or sprite.get("data-preview")

        # Preview videos
        for attr in ["data-previewvideo", "data-previewvideo-fallback", "data-preview", "data-src"]:
            for el in soup.select(f"[{attr}]"):
                val = el.get(attr)
                if val and any(ext in val.lower() for ext in [".mp4", ".webm"]):
                    data["preview_videos"].append(urljoin(page_url, val))
        data["preview_videos"] = self._clean_list(data["preview_videos"])

        # Channel
        for sel in [".video-uploader__name", ".uploader a", ".author a", ".channel-name", "a[href*='channel']", ".username"]:
            ch = soup.select_one(sel)
            if ch and ch.get_text(strip=True):
                data["channel"] = ch.get_text(strip=True)
                if ch.get("href"):
                    data["channel_url"] = urljoin(page_url, ch.get("href"))
                break

        # Regex for streams from HTML
        data["m3u8_links"].extend(re.findall(r'https?://[^\s"\'<>]+?\.m3u8[^\s"\'<>]*', html))
        data["direct_video_links"].extend(re.findall(
            r'https?://[^\s"\'<>]+?(?:\.mp4|\.m3u8|media=hls|_TPL_\.av1\.mp4)[^\s"\'<>]*', html
        ))
        data["m3u8_links"] = self._clean_list(data["m3u8_links"])
        data["direct_video_links"] = self._clean_list(data["direct_video_links"])

        return data

    def extract_listing(self, html: str, base_url: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        items = soup.select(
            'div.video-thumb, div.thumb-list__item, div[data-video-id], '
            'div.video-thumb--type-video, div.thumb, div.video-item, '
            'article.video, .video-card, .post, article'
        )
        results = []
        for item in items:
            data = self._new_data_template()
            link = item.select_one("a[href]")
            if link and link.get("href"):
                href = link.get("href")
                if any(x in href.lower() for x in ["/video", "/watch", "/v/", "mms", "sex"]):
                    data["video_page_url"] = urljoin(base_url, href)
                    data["title"] = (link.get("title") or link.get_text(strip=True) or "").strip()

            for img in item.select("img[src], img[data-src]"):
                src = img.get("src") or img.get("data-src")
                if src:
                    data["thumbnails"].append(urljoin(base_url, src))
            data["thumbnails"] = self._clean_list(data["thumbnails"])

            if data["video_page_url"] or data["title"]:
                results.append(data)
        return results

    def get_yt_dlp_info(self, video_url: str, download: bool = False) -> dict:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": not download,
            "format": "bestvideo+bestaudio/best",
            "merge_output_format": "mp4",
            "http_headers": self.get_headers(video_url),
            "retries": 5,
            "fragment_retries": 5,
            "extractor_retries": 3,
        }

        info = {
            "title": None, "duration": None, "view_count": None,
            "uploader": None, "formats": [], "m3u8_urls": [],
            "direct_urls": [], "best_url": None, "error": None
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
                    if "m3u8" in protocol or url.endswith(".m3u8"):
                        info["m3u8_urls"].append(url)
                    else:
                        info["direct_urls"].append(url)

                info["m3u8_urls"] = self._clean_list(info["m3u8_urls"])
                info["direct_urls"] = self._clean_list(info["direct_urls"])

        except Exception as e:
            info["error"] = str(e)
            print(f"    [yt-dlp] {str(e)[:100]}")

        return info

    def process(self, url: str, max_videos: int = 12, use_ytdlp: bool = True, download: bool = False):
        html = self.fetch(url)

        results = []
        is_single = any(x in url.lower() for x in ["/video/", "/videos/", "/watch", "/v/"])

        if html:
            if is_single:
                print("[*] Extracting single video page...")
                data = self.extract_single_page(html, url)
                results = [data]
            else:
                print("[*] Extracting listing...")
                results = self.extract_listing(html, url)[:max_videos]
        else:
            # Agar page hi nahi mila to seedha yt-dlp se try karo
            print("[*] Page fetch failed. Trying direct yt-dlp...")
            results = [self._new_data_template(url)]

        # yt-dlp enrichment (yeh sabse important hai)
        if use_ytdlp:
            print("[*] Extracting real streams with yt-dlp...")
            for item in results:
                vurl = item.get("video_page_url") or url
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
                if not item.get("title"): item["title"] = yinfo.get("title")
                if not item.get("duration"): item["duration"] = str(yinfo.get("duration") or "")
                if not item.get("views"): item["views"] = str(yinfo.get("view_count") or "")
                if not item.get("channel"): item["channel"] = yinfo.get("uploader")

        return results

    def load_existing(self):
        if os.path.exists(self.json_file):
            try:
                with open(self.json_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except:
                return []
        return []

    def save_json(self, new_data: list):
        existing = self.load_existing()
        existing_urls = {i.get("video_page_url") for i in existing if i.get("video_page_url")}

        added = 0
        for item in new_data:
            url = item.get("video_page_url")
            if url and url not in existing_urls:
                existing.append(item)
                added += 1
            elif not url:
                existing.append(item)
                added += 1

        with open(self.json_file, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)
        print(f"[+] JSON updated | Added: {added} | Total: {len(existing)}")

    def save_html_report(self):
        all_data = self.load_existing()
        rows = []
        for i, v in enumerate(all_data, 1):
            yinfo = v.get("yt_dlp_info") or {}
            m3u8s = v.get("m3u8_links") or yinfo.get("m3u8_urls") or []
            directs = v.get("direct_video_links") or []
            previews = v.get("preview_videos") or []

            thumbs = "".join(f'<img src="{t}" height="55" style="margin:2px;border-radius:4px">' for t in (v.get("thumbnails") or [])[:2])
            preview_html = "<br>".join(previews[:2]) if previews else "-"
            m3u8_html = "<br>".join(m3u8s[:3]) if m3u8s else "No m3u8"
            direct_html = "<br>".join(directs[:2]) if directs else "-"

            rows.append(f"""
            <tr>
                <td>{i}</td>
                <td><strong>{v.get('title') or 'N/A'}</strong><br>
                    <a href="{v.get('video_page_url')}" target="_blank">Open</a><br>
                    <small>{v.get('source_site')}</small></td>
                <td>{v.get('duration') or '-'}</td>
                <td>{v.get('views') or '-'}</td>
                <td>{v.get('channel') or '-'}</td>
                <td>{thumbs}</td>
                <td style="font-size:11px;word-break:break-all;">{preview_html}</td>
                <td style="font-size:11px;word-break:break-all;">{m3u8_html}</td>
                <td style="font-size:11px;word-break:break-all;">{direct_html}</td>
            </tr>""")

        html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>Video Extract Report</title>
<style>body{{font-family:system-ui;background:#0f0f0f;color:#eee;margin:20px}}
table{{border-collapse:collapse;width:100%;font-size:13px}} th,td{{border:1px solid #333;padding:7px;vertical-align:top}}
th{{background:#1a1a1a}} a{{color:#6af}} tr:hover{{background:#181818}}</style></head>
<body><h1>Universal Video Extract Report</h1>
<p>Updated: {datetime.now().strftime('%Y-%m-%d %H:%M')} | Total: {len(all_data)}</p>
<table><thead><tr>
<th>#</th><th>Title</th><th>Duration</th><th>Views</th><th>Channel</th>
<th>Thumbs</th><th>Preview MP4</th><th>m3u8</th><th>Direct MP4</th>
</tr></thead><tbody>{''.join(rows)}</tbody></table></body></html>"""

        with open(self.html_file, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"[+] Report saved → {self.html_file}")


if __name__ == "__main__":
    extractor = UniversalVideoExtractor()

    print("=" * 60)
    print("  Universal Video Extractor (Strong Anti-Bot)")
    print("=" * 60)

    url = input("\nEnter URL: ").strip()
    if not url:
        exit()

    max_v = input("Max videos (default 10): ").strip()
    max_v = int(max_v) if max_v.isdigit() else 10

    use_ytdlp = input("Use yt-dlp? (y/n default y): ").strip().lower() != "n"
    do_download = input("Download videos? (y/n default n): ").strip().lower() == "y"

    print("\n[*] Starting...\n")
    results = extractor.process(url, max_videos=max_v, use_ytdlp=use_ytdlp, download=do_download)

    if results:
        extractor.save_json(results)
        extractor.save_html_report()
        print(f"\n[✓] Done! Processed {len(results)} items.")
    else:
        print("[!] No data extracted.")