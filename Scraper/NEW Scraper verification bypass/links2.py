import os
import re
from playwright.sync_api import sync_playwright

# --- CONFIGURATION ---
OUTPUT_FILE = "media_links.html"
TARGET_VIDEO_COUNT = 10  # Ek baar me kitne videos nikalne hain
# ---------------------

def get_next_session_number():
    if not os.path.exists(OUTPUT_FILE):
        return 1
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            content = f.read()
        sessions = re.findall(r'Session #(\d+)', content)
        if sessions:
            return max([int(x) for x in sessions]) + 1
    except Exception:
        pass
    return 1

def initialize_html_file():
    if os.path.exists(OUTPUT_FILE):
        return
        
    base_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Automated Multi-Page Video Database</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; background-color: #f4f6f9; color: #333; }}
        h1 {{ color: #2c3e50; text-align: center; margin-bottom: 30px; border-bottom: 3px solid #e74c3c; padding-bottom: 10px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }}
        th {{ background-color: #e74c3c; color: white; padding: 15px; text-align: left; font-size: 16px; }}
        td {{ padding: 15px; border-bottom: 1px solid #e0e0e0; vertical-align: top; word-break: break-all; }}
        tr:hover {{ background-color: #f9f9f9; }}
        .thumb-img {{ width: 140px; height: auto; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); background-color: #ddd; display: block; }}
        .session-badge {{ background: #2c3e50; color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }}
        .video-link {{ color: #3498db; text-decoration: none; font-weight: 500; }}
        .video-link:hover {{ text-decoration: underline; }}
        .no-thumb {{ font-size: 12px; color: #7f8c8d; font-style: italic; }}
    </style>
</head>
<body>
    <h1>🎬 Automated Multi-Page Video Database</h1>
    <table>
        <thead>
            <tr>
                <th style="width: 10%;">S.No / Session</th>
                <th style="width: 25%;">Video Title</th>
                <th style="width: 15%;">Thumbnail</th>
                <th style="width: 50%;">Video Resource URL</th>
            </tr>
        </thead>
        <tbody id="data-rows">
        <!-- NEW_ROWS_HERE -->
        </tbody>
    </table>
</body>
</html>
"""
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(base_html)

def find_next_page_button(page):
    """Yeh function page par maujood 'Next', 'Older', ya '>' buttons ko auto-detect karega."""
    selectors = [
        "a:has-text('Next')", "a:has-text('Older')", "a:has-text('>')",
        ".next", ".pagination-next", "a[rel='next']", ".pagination a:last-child"
    ]
    for selector in selectors:
        try:
            element = page.locator(selector).first
            if element.is_visible() and element.is_enabled():
                return element
        except Exception:
            continue
    return None

def extract_videos_from_page(page, page_title, target_url):
    """Current page se videos aur unka meta-data extract karne ka function."""
    return page.evaluate("""(data) => {
        let results = [];
        
        // 1. Try structural video tags
        let videoElements = document.querySelectorAll('video');
        videoElements.forEach(v => {
            let src = v.src || v.querySelector('source')?.src;
            let poster = v.poster || "";
            if (src && src.startsWith('http')) {
                results.push({ title: document.title || "Video", thumbnail: poster, url: src, source: data.url });
            }
        });
        
        // 2. Try Open Graph video meta tags
        if(results.length === 0) {
            let ogVideo = document.querySelector('meta[property="og:video"]')?.content;
            let ogImage = document.querySelector('meta[property="og:image"]')?.content;
            if(ogVideo) {
                results.push({ title: document.title, thumbnail: ogImage || "", url: ogVideo, source: data.url });
            }
        }
        
        // 3. Fallback: Search all anchor links pointing to video files
        if(results.length === 0) {
            let links = document.querySelectorAll('a');
            links.forEach(a => {
                let href = a.href;
                if(href && (href.endsWith('.mp4') || href.endsWith('.m3u8') || href.includes('stream') || href.includes('/video/'))) {
                    // Try to find an image inside this link to use as thumbnail
                    let imgInside = a.querySelector('img')?.src || "";
                    results.push({ title: a.innerText.strip() || data.title, thumbnail: imgInside, url: href, source: data.url });
                }
            });
        }
        
        return results;
    """, {"url": target_url, "title": page_title})

def scrape_media():
    target_url = input("🔗 Automated Multi-Page Scraper ke liye URL dalein: ").strip()
    if not target_url:
        print("❌ Invalid URL!")
        return

    initialize_html_file()
    session_num = get_next_session_number()
    
    all_scraped_videos = []
    seen_urls = set()
    page_counter = 1
    
    print(f"\n🚀 Starting Automated Session #{session_num}...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 720}
        )
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")
        
        current_url = target_url
        
        while len(all_scraped_videos) < TARGET_VIDEO_COUNT:
            print(f"\n📄 Scraping Page {page_counter}: {current_url}")
            try:
                page.goto(current_url, wait_until="networkidle", timeout=60000)
                page.wait_for_timeout(4000) # Cloudflare bypass buffer
                
                page_title = page.title() or "Video Page"
                page_videos = extract_videos_from_page(page, page_title, current_url)
                
                new_found = 0
                for vid in page_videos:
                    if vid['url'] not in seen_urls and len(all_scraped_videos) < TARGET_VIDEO_COUNT:
                        seen_urls.add(vid['url'])
                        all_scraped_videos.append(vid)
                        new_found += 1
                
                print(f"✅ Found {new_found} new unique videos on this page. Total collected so far: {len(all_scraped_videos)}/{TARGET_VIDEO_COUNT}")
                
                # Agar Target reach ho gaya ho toh loop todd do
                if len(all_scraped_videos) >= TARGET_VIDEO_COUNT:
                    print(f"🎯 Target reached! Collected {TARGET_VIDEO_COUNT} videos.")
                    break
                    
                # Agla page dhoondhna
                next_btn = find_next_page_button(page)
                if next_btn:
                    print("➡️ Next page button mil gaya. Clicking to go to the next page...")
                    # Agle page par jaane se pehle current URL backup kar lete hain pagination detect karne ke liye
                    old_url = page.url
                    next_btn.click()
                    page.wait_for_timeout(3000)
                    current_url = page.url
                    
                    if current_url == old_url:
                        print("⚠️ Button click karne par bhi URL nahi badla. Multi-page automation stopped.")
                        break
                    page_counter += 1
                else:
                    print("🛑 Is page par koi 'Next' ya pagination button nahi mila. Stopping automation.")
                    break
                    
            except Exception as e:
                print(f"❌ Error occurred on Page {page_counter}: {e}")
                break
                
        browser.close()
        
    # --- HTML UPDATE LOGIC ---
    if all_scraped_videos:
        print(f"\n💾 Saving {len(all_scraped_videos)} records to {OUTPUT_FILE}...")
        new_rows_html = ""
        for index, item in enumerate(all_scraped_videos, start=1):
            clean_title = item["title"].replace("\n", " ").strip()
            thumb_html = f'<img src="{item["thumbnail"]}" class="thumb-img" alt="No Thumbnail">' if item["thumbnail"] else '<span class="no-thumb">No Preview Available</span>'
            link_html = f'<a href="{item["url"]}" target="_blank" class="video-link">{item["url"]}</a>'
            
            new_rows_html += f"""
            <tr>
                <td><span class="session-badge">Session #{session_num} ({index})</span></td>
                <td><strong>{clean_title}</strong><br><small style="color:#7f8c8d;">Source: {item['source']}</small></td>
                <td>{thumb_html}</td>
                <td>{link_html}</td>
            </tr>"""

        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            current_html = f.read()
        
        updated_html = current_html.replace("<!-- NEW_ROWS_HERE -->", f"{new_rows_html}\n        <!-- NEW_ROWS_HERE -->")
        
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(updated_html)
            
        print(f"✨ Mission Successful! File updated. Check '{OUTPUT_FILE}'.")
    else:
        print("❌ Ek bhi video link extract nahi ho paya pure cycle me.")

if __name__ == "__main__":
    scrape_media()
