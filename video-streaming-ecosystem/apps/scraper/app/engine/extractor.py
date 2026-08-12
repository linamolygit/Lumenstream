import json
import re
import uuid
from datetime import datetime
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests
import yt_dlp
from slugify import slugify


class AdvancedMultiSiteExtractor:
    def __init__(self, impersonate: str = "chrome120"):
        self.impersonate = impersonate
        self.session = cffi_requests.Session()

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

    def _extract_initials_json(self, html: str) -> dict | None:
        """Extract window.initials or similar JSON from page (xHamster style)"""
        patterns = [
            r'window\.initials\s*=\s*({.*?});?\s*(?:</script>|$)',
            r'window\.initials\s*=\s*({.*?})\s*;',
            r'id=["\']initials-script["\'][^>]*>\s*window\.initials\s*=\s*({.*?});?\s*</script>',
            r'window\.__INITIAL_STATE__\s*=\s*({.*?});',
        ]
        for pat in patterns:
            m = re.search(pat, html, re.DOTALL)
            if m:
                try:
                    raw = m.group(1)
                    raw = re.sub(r';\s*$', '', raw)
                    return json.loads(raw)
                except Exception:
                    continue
        return None

    def get_yt_dlp_info(self, video_url: str) -> dict:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "format": "bestvideo+bestaudio/best",
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": video_url,
            },
            "retries": 3,
        }

        info = {
            "title": None,
            "duration": None,
            "view_count": None,
            "uploader": None,
            "m3u8_urls": [],
            "direct_urls": [],
            "best_url": None,
            "error": None
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(video_url, download=False)
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
        except Exception as e:
            info["error"] = str(e)
            print(f"[yt-dlp Error] {e}")

        return info

    def refresh_m3u8(self, page_url: str) -> dict:
        yinfo = self.get_yt_dlp_info(page_url)
        return {
            "m3u8_links": yinfo.get("m3u8_urls", []),
            "direct_video_links": [yinfo["best_url"]] if yinfo.get("best_url") else [],
            "duration": yinfo.get("duration"),
            "error": yinfo.get("error"),
            "success": bool(yinfo.get("m3u8_urls") or yinfo.get("best_url"))
        }

    def extract_single(self, page_url: str) -> dict | None:
        html = self.fetch(page_url)
        if not html:
            return None

        soup = BeautifulSoup(html, "lxml")
        vid_uuid = str(uuid.uuid4())

        data = {
            "uuid": vid_uuid,
            "source_page_url": page_url,
            "source_site": urlparse(page_url).netloc,
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

        # 1. Check window.initials for xHamster/JSON model
        initials = self._extract_initials_json(html)
        video_model = None
        if initials:
            video_model = (
                initials.get("videoModel")
                or initials.get("video")
                or (initials.get("page") or {}).get("video")
            )

        if video_model and isinstance(video_model, dict):
            if video_model.get("title"):
                data["title"] = video_model["title"]
            if video_model.get("duration"):
                try:
                    data["duration"] = int(video_model["duration"])
                except Exception:
                    pass
            if video_model.get("views"):
                data["source_views"] = str(video_model["views"])

            trailer = video_model.get("trailerURL") or video_model.get("trailer")
            if trailer and any(ext in trailer.lower() for ext in [".mp4", ".webm", ".mov"]):
                data["preview_videos"].append(trailer)

            sprite = video_model.get("spriteURL") or video_model.get("sprite")
            if sprite:
                data["sprite"] = sprite

            for key in ["thumbURL", "previewThumbURL", "thumb"]:
                if video_model.get(key):
                    data["thumbnails"].append(video_model[key])

            author = video_model.get("author") or video_model.get("channelModel") or {}
            if isinstance(author, dict):
                data["channel_name"] = author.get("name") or author.get("username")
                data["channel_url"] = author.get("pageURL") or author.get("link")
                if author.get("logo") or author.get("avatar"):
                    data["channel_logo"] = author.get("logo") or author.get("avatar")

        # 2. Fallback HTML parsing
        if not data["title"]:
            title_tag = (
                soup.select_one('meta[property="og:title"]') or
                soup.select_one('meta[name="twitter:title"]') or
                soup.select_one("h1") or
                soup.select_one("title")
            )
            if title_tag:
                data["title"] = (title_tag.get("content") or title_tag.get_text(strip=True) or "").strip()

        # Thumbnails
        for meta in soup.select('meta[property="og:image"], meta[name="twitter:image"]'):
            if meta.get("content"):
                data["thumbnails"].append(meta["content"])
        for img in soup.select('img[src*=".webp"], img[src*=".jpg"], img[src*=".png"]'):
            src = img.get("src") or img.get("data-src")
            if src and not any(x in src.lower() for x in ["logo", "avatar", "icon"]):
                data["thumbnails"].append(urljoin(page_url, src))

        data["thumbnails"] = self._clean_list(data["thumbnails"])
        if data["thumbnails"]:
            data["thumbnail"] = data["thumbnails"][0]

        # Container isolated Sprite
        if not data["sprite"]:
            sprite_el = soup.select_one(".xplayer [data-sprite], #video_box [data-sprite], [data-sprite]")
            if sprite_el and sprite_el.get("data-sprite"):
                data["sprite"] = sprite_el.get("data-sprite")

        # Container isolated Preview Videos
        if not data["preview_videos"]:
            main_player = (
                soup.select_one("#video_box") or
                soup.select_one(".xplayer") or
                soup.select_one(".video-player") or
                soup.select_one("main") or
                soup
            )
            preview_attrs = ["data-previewvideo", "data-previewvideo-fallback", "data-preview", "data-src-preview"]
            for attr in preview_attrs:
                for el in main_player.select(f"[{attr}]"):
                    val = el.get(attr)
                    if val and any(ext in val.lower() for ext in [".mp4", ".webm", ".mov"]):
                        data["preview_videos"].append(urljoin(page_url, val))

        data["preview_videos"] = self._clean_list(data["preview_videos"])

        # Channel fallback
        if not data["channel_name"]:
            ch = soup.select_one(".video-uploader__name, .uploader a, .author a, .channel-name, a[href*='/channels/']")
            if ch:
                data["channel_name"] = ch.get_text(strip=True)
                if ch.get("href"):
                    data["channel_url"] = urljoin(page_url, ch.get("href"))

        # 3. Stream Extraction via yt-dlp
        yinfo = self.get_yt_dlp_info(page_url)
        if yinfo.get("m3u8_urls"):
            data["m3u8_links"] = yinfo["m3u8_urls"]
        if yinfo.get("direct_urls"):
            data["direct_video_links"] = yinfo["direct_urls"]
        if yinfo.get("best_url"):
            data["direct_video_links"] = self._clean_list(data["direct_video_links"] + [yinfo["best_url"]])

        if not data["title"] and yinfo.get("title"):
            data["title"] = yinfo["title"]
        if not data["duration"] and yinfo.get("duration"):
            data["duration"] = int(yinfo["duration"])

        if data["title"]:
            data["slug"] = slugify(data["title"])[:200]
        else:
            data["title"] = "Untitled Video"
            data["slug"] = f"video-{vid_uuid[:8]}"

        return data

    def extract_listing(self, listing_url: str, max_videos: int = 15) -> list[str]:
        html = self.fetch(listing_url)
        if not html:
            return []

        soup = BeautifulSoup(html, "lxml")
        video_urls = []

        items = soup.select(
            'div.video-thumb, div.thumb-list__item, div[data-video-id], '
            'div.video-thumb--type-video, div[data-role="related-item"], '
            'div.thumb, div.video-item, article.video, .video-card, .thumb-block, '
            'a[href*="/videos/"], a[href*="/video/"]'
        )

        for item in items:
            href = None
            if item.name == "a":
                href = item.get("href")
            else:
                link = item.select_one('a[href*="/video"], a[href*="/videos/"], a[data-role="thumb-link"], a')
                if link:
                    href = link.get("href")

            if href:
                # Filter out non-video page links
                if any(x in href.lower() for x in ["/photo", "/gallery", "/user/", "/channel/", "/creator"]):
                    continue
                full_url = urljoin(listing_url, href)
                path = urlparse(full_url).path.lower()
                if any(x in path for x in ["/video/", "/videos/", "/v/", "/watch"]):
                    if full_url not in video_urls:
                        video_urls.append(full_url)
                        if len(video_urls) >= max_videos:
                            break

        return video_urls
