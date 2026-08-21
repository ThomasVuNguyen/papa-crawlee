# Papa — apify.beenex.org

Crawlee playground deployed via Coolify on lenovo (`http://apify.beenex.org`).

- `GET /` — index
- `GET /crawl?url=https://crawlee.dev` — CheerioCrawler smoke
- `GET /crawl?case=books` — books.toscrape
- `GET /health`

Build: `npm run build` → `node dist/server.js` on port 3000 (Coolify `ports_exposes=3000`).
Base: `apify/actor-node:22` (no browser). Swap to `actor-node-playwright-chrome:22` for Playwright cases.
