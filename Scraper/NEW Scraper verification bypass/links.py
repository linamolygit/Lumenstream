import os
import re
from playwright.sync_api import sync_playwright

# --- CONFIGURATION ---
OUTPUT_FILE = "media_links.html"
# ---------------------

def get_next_session_number():
    """Yeh function check karega ki pehle kitni baar scrape ho chuka hai, taaki number sahi aaye."""
    if not os.path.exists(OUTPUT_FILE):
        return 1
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            content = f.read()
        # HTML me 'Session #' pattern ko dhoond kar count nikalna
        sessions = re.findall(r'Session #(\num)', content)
        if not sessions:
            sessions = re.findall(r'Session #(\d+)', content)
        if sessions:
            return max([int(x) for x in sessions]) + 1
    except Exception:
        pass
    return 1

def initialize_html_file():
    """Agar file pehle se nahi bani hai, toh basic structure aur table headers banayega."""
    if os.path.exists(OUTPUT_FILE):
        return
        
    base_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dynamic Scraped Video Database</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; background-color: #f4f6f9; color: #333; }}
        h1 {{ color: #2c3e50; text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }}
        th {{ background-color: #3498db; color: white; padding: 15px; text-align: left; font-size: 16px; }}
        td {{ padding: 15px; border-bottom: 1px solid #e0e0e0; vertical-align: top; word-break: break-all; }}
        tr:hover {{ background-color: #f9f9f9; }}
        .thumb-img {{ width: 140px; height: auto; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); background-color: #ddd; display: block; }}
        .session-badge {{ background: #2c3e50; color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }}
        .video-link {{ color: #e74c3c; text-decoration: none; font-weight: 500; }}
        .video-link:hover {{ text-decoration: underline; }}
        .no-thumb {{ font-size: 12px; color: #7f8c8d; font-style: italic; }}
    </style>
</head>
<body>
    <h1>🎬 Multi-Session Scraped Video Database</h1>
    <table>
        <thead>
            <tr>
                <th style="width: 8%;">S.No / Session</th>
                <th style="width: 25%;">Video Title</th>
                <th style="width: 17%;">Thumbnail</th>
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

def scrape_media():
    # User se dynamic URL input lena
    target_url = input("🔗 Bhai, jis site ko scrape karna hai uska URL yahan paste karo: ").strip()
    if not target_url:
        print("❌ Khali URL nahi chalega! Script band ho rahi hai.")
        return

    initialize_html_file()
    session_num = get_next_session_number()
    
    print(f"\n🚀 Opening browser for Session #{session_num}...")
    print(f"🌍 Navigating to: {target_url}...")
    
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
        
        try:
            page.goto(target_url, wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(5000) # Cloudflare aur elements load hone ka buffer time
            
            # Page Title nikalna
            page_title = page.title() or "Untitled Video Page"
            print(f"📌 Page Title Found: {page_title}")
            
            print("🎥 Extracting Videos, Titles, and Thumbnails...")
            # Browser ke andar JS run karke structured data nikalna
            video_data_list = page.evaluate("""() => {
                let results = [];
                
                // 1. Pehle <video> elements ko scan karo
                let videoElements = document.querySelectorAll('video');
                videoElements.forEach(v => {
                    let src = v.src || v.querySelector('source')?.src;
                    let poster = v.poster || "";
                    
                    if (src && src.startsWith('http')) {
                        results.push({
                            title: document.title || "Video Element",
                            thumbnail: poster,
                            url: src
                        });
                    }
                });
                
                // 2. Agar video elements na milein, toh iframe ya open graph tags check karo (Jaise YouTube embeds etc)
                if(results.length === 0) {
                    let ogVideo = document.querySelector('meta[property="og:video"]')?.content;
                    let ogImage = document.querySelector('meta[property="og:image"]')?.content;
                    if(ogVideo) {
                        results.push({
                            title: document.title || "OG Video Meta",
                            thumbnail: ogImage || "",
                            url: ogVideo
                        });
                    }
                }
                
                return results;
            }""")
            
            # Agar koi structural video link nahi mila, toh pure page par generic links fallback lagana
            if not video_data_list:
                print("⚠️ Structural video tag nahi mila. Standalone links scan kar raha hoon...")
                fallback_videos = page.evaluate("""() => {
                    return Array.from(document.querySelectorAll('a'))
                                .map(a => a.href)
                                .filter(href => href && (href.endswith('.mp4') || href.endswith('.m3u8') || href.includes('stream')));
                }""")
                for f_vid in set(fallback_videos):
                    video_data_list.append({
                        "title": page_title,
                        "thumbnail": "",
                        "url": f_vid
                    })

            if not video_data_list:
                print("❌ Is page par koi video ya stream link nahi mil paya.")
                # Ek empty row entry de dete hain taaki history me record rahe ki yahan kuch nahi mila
                video_data_list = [{"title": page_title, "thumbnail": "", "url": "No clear video URL detected"}]

            # Naye Rows ka HTML ready karna
            new_rows_html = ""
            for item in video_data_list:
                thumb_html = f'<img src="{item["thumbnail"]}" class="thumb-img" alt="No Thumbnail">' if item["thumbnail"] else '<span class="no-thumb">No Preview Available</span>'
                link_html = f'<a href="{item["url"]}" target="_blank" class="video-link">{item["url"]}</a>' if "http" in item["url"] else f'<span>{item["url"]}</span>'
                
                new_rows_html += f"""
            <tr>
                <td><span class="session-badge">Session #{session_num}</span></td>
                <td><strong>{item["title"]}</strong><br><small style="color:#7f8c8d;">Source: {target_url}</small></td>
                <td>{thumb_html}</td>
                <td>{link_html}</td>
            </tr>"""

            # HTML File me purane data ke upar/niche append karna safely
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                current_html = f.read()
            
            # Placeholder replacement ke zariye list ko update karna
            updated_html = current_html.replace("<!-- NEW_ROWS_HERE -->", f"{new_rows_html}\n        <!-- NEW_ROWS_HERE -->")
            
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                f.write(updated_html)
                
            print(f"💾 Success! Session #{session_num} ka data table me add ho gaya hai.")
            
        except Exception as e:
            print(f"❌ Error occurred: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    scrape_media()
