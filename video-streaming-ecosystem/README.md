# Video Streaming Ecosystem

This repository contains a skeleton for a video streaming ecosystem inspired by xHamster-style metadata extraction, HLS proxy streaming, and WordPress-compatible stream links.

## Structure

- `apps/web` — Next.js frontend with admin UI and watch pages.
- `apps/api` — Node.js + Express API that exposes video metadata, admin CRUD, and stream access.
- `apps/scraper` — FastAPI scraper service that extracts metadata and HLS links from sources and writes to MySQL.
- `workers/media-proxy` — Cloudflare Worker that rewrites HLS playlists and proxies segment traffic.
- `docker-compose.yml` — Local MySQL and Redis development services.

## What is included

- Prisma schema and SQLAlchemy models for video metadata and analytics.
- FastAPI scraper endpoints for single video and listing extraction.
- Express API skeleton for video listing, video details, and proxy access metadata.
- Next.js pages for watch and manage stream links.
- Cloudflare Worker code for HLS playlist rewrite and segment proxy.

## Start here

1. Configure `.env` files in `apps/api` and `apps/scraper`.
2. Run `docker compose up -d` from the workspace root.
3. Install dependencies in each app directory.
4. Seed the database and run the FastAPI scraper + Express backend.
5. Deploy the worker with Wrangler and connect the frontend to the backend.
