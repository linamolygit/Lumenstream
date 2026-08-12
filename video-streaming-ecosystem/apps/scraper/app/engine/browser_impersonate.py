import httpx


def make_request(url: str) -> str | None:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        with httpx.Client(timeout=30.0, headers=headers, follow_redirects=True) as client:
            response = client.get(url)
            if response.status_code == 200:
                return response.text
    except httpx.HTTPError:
        return None
    return None
