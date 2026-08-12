from fastapi import FastAPI
from .api.scrape import router as scrape_router
from .api.health import router as health_router

app = FastAPI(title="VSE Scraper Service")

app.include_router(health_router, prefix="/health")
app.include_router(scrape_router, prefix="/scrape")

@app.get("/")
async def root():
    return {"status": "ok", "service": "vse-scraper"}
