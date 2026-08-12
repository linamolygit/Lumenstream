import re
import uuid
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests
import yt_dlp
from slugify import slugify   # pip install python-slugify

class AdvancedXHExtractor:
    def __init__(self, impersonate: str = "chrome120"):
        self.impersonate = impersonate
        self.session = cffi_requests.Session()

    def fetch(self, url: str) -> str | None:
        try:
            r = self.session.get(url, impersonate=self.impersonate, timeout=25)
            r.raise_for_status()
            return r.text
        except Exception as e:
            print(f"[Fetch Error] {url} → {e}")
            return None

    def get_yt_dlp_info(self, video_url: str) -> dict:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "format": "best",
        }
        info = {"m3u8_urls": [], "best_url": None, "title": None, "duration": None, "error": None}
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(video_url, download=False)
                info["title"] = result.get("title")
                info["duration"] = result.get("duration")
                info["best_url"] = result.get("url")
                for f in result.get("formats", []):
                    url = f.get("url")
                    if url and ("m3u8" in str(f.get("protocol", "")).lower() or url.endswith(".m3u8")):
                        info["m3u8_urls"].append(url)
        except Exception as e:
            info["error"] = str(e)
        return info

    def extract_single(self, page_url: str) -> dict | None:
        html = self.fetch(page_url)
        if not html:
            return None

        soup = BeautifulSoup(html, "lxml")
        data = {
            "uuid": str(uuid.uuid4()),
            "source_page_url": page_url,
            "title": None,
            "slug": None,
            "duration": 0,
            "source_views": None,
            "channel_name": None,
            "channel_url": None,
            "channel_logo": None,
            "thumbnail": None,
            "thumbnails": [],
            "sprite": None,
            "preview_videos": [],
            "m3u8_links": [],
            "direct_video_links": [],
        }

        # Title
        title_tag = soup.select_one("h1") or soup.select_one('meta[property="og:title"]')
        if title_tag:
            data["title"] = (title_tag.get("content") or title_tag.get_text(strip=True) or "").strip()
            data["slug"] = slugify(data["title"])[:200]

        # Thumbnails
        for meta in soup.select('meta[property="og:image"]'):
            if meta.get("content"):
                data["thumbnails"].append(meta["content"])
        for img in soup.select('img[src*=".webp"]'):
            src = img.get("src")
            if src and "logo" not in src.lower():
                data["thumbnails"].append(src)
        data["thumbnails"] = list(dict.fromkeys(data["thumbnails"]))
        data["thumbnail"] = data["thumbnails"][0] if data["thumbnails"] else None

        # Sprite + Preview
        sprite = soup.select_one("[data-sprite]")
        if sprite:
            data["sprite"] = sprite.get("data-sprite")
        for attr in ["data-previewvideo", "data-previewvideo-fallback"]:
            el = soup.select_one(f"[{attr}]")
            if el and el.get(attr):
                data["preview_videos"].append(el.get(attr))

        # Channel
        ch = soup.select_one(".video-uploader__name, a[href*='/channels/']")
        if ch:
            data["channel_name"] = ch.get_text(strip=True)
            data["channel_url"] = urljoin(page_url, ch.get("href", ""))

        # yt-dlp for reliable streams
        yinfo = self.get_yt_dlp_info(page_url)
        data["m3u8_links"] = yinfo.get("m3u8_urls", [])
        if yinfo.get("best_url"):
            data["direct_video_links"].append(yinfo["best_url"])
        if yinfo.get("duration"):
            data["duration"] = yinfo["duration"]
        if not data["title"] and yinfo.get("title"):
            data["title"] = yinfo["title"]
            data["slug"] = slugify(data["title"])[:200]

        return data
