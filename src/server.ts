import express from 'express';
import { CheerioCrawler, Dataset } from 'crawlee';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.get('/', (_req, res) => {
    res.send(`
        <h1>Papa Crawlee — apify.beenex.org</h1>
        <p>Deployed on Coolify (lenovo • http://apify.beenex.org)</p>
        <ul>
            <li><a href="/crawl?url=https://crawlee.dev">/crawl?url=https://crawlee.dev</a> — smoke test (CheerioCrawler title)</li>
            <li><a href="/crawl?case=books">/crawl?case=books</a> — books.toscrape (Cheerio, pagination sample)</li>
            <li><a href="/crawl?case=quotes">/crawl?case=quotes</a> — quotes.toscrape</li>
            <li><a href="/crawl?case=httpbin">/crawl?case=httpbin</a> — httpbin json</li>
            <li><a href="/zapier?limit=100&pages=1">/zapier?limit=100&pages=1</a> — Zapier integration list (10014 apps)</li>
            <li><a href="/zapier?limit=100&pages=101">/zapier?limit=100&pages=101</a> — full Zapier dump (10k)</li>
            <li><a href="/health">/health</a></li>
        </ul>
        <p>See <a href="https://github.com/apify/crawlee">crawlee.dev</a> • test cases in test.md</p>
    `);
});

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Zapier: fetch full app directory via public API https://zapier.com/api/v4/apps
async function fetchZapierApps(limit = 100, maxPages = 5): Promise<any[]> {
    const all: any[] = [];
    let offset = 0;
    let total = Infinity;
    for (let page = 0; page < maxPages && offset < total; page++) {
        const resp = await fetch(`https://zapier.com/api/v4/apps?limit=${limit}&offset=${offset}`, {
            headers: { 'User-Agent': 'papa-crawlee/1.0', Accept: 'application/json' },
        });
        if (!resp.ok) throw new Error(`Zapier API ${resp.status}`);
        const data: any = await resp.json();
        total = data.count;
        const results = data.results || [];
        for (const r of results) {
            all.push({
                id: r.id,
                name: r.name,
                slug: r.slug,
                description: r.description,
                url: `https://zapier.com${r.app_profile_url}`,
                categories: (r.categories || []).map((c: any) => c.title),
                popularity: r.popularity,
            });
        }
        if (!data.next) break;
        offset += limit;
    }
    return all;
}

app.get('/zapier', async (req, res) => {
    const limit = Math.min(parseInt((req.query.limit as string) || '100', 10), 100);
    const pages = Math.min(parseInt((req.query.pages as string) || '2', 10), 101); // 101*100 = 10k
    try {
        const start = Date.now();
        const apps = await fetchZapierApps(limit, pages);
        res.json({ count: apps.length, total: 10014, limit, pages, durationMs: Date.now() - start, apps });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

async function runCrawl(targetUrl: string, label = 'smoke'): Promise<any[]> {
    const results: any[] = [];
    const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: 5,
        async requestHandler({ $, request, enqueueLinks, log }) {
            const title = $('title').text().trim();
            log.info(`[${label}] ${title} @ ${request.loadedUrl}`);
            results.push({ url: request.loadedUrl, title });
            if (results.length < 3) {
                await enqueueLinks({ globs: [`${new URL(targetUrl).origin}/**`], label: 'detail' }).catch(() => {});
            }
        },
    });
    await crawler.run([targetUrl]);
    return results;
}

app.get('/crawl', async (req, res) => {
    const url = (req.query.url as string) || '';
    const c = (req.query.case as string) || '';
    if (c === 'zapier') {
        const limit = Math.min(parseInt((req.query.limit as string) || '100', 10), 100);
        const pages = Math.min(parseInt((req.query.pages as string) || '2', 10), 101);
        try {
            const start = Date.now();
            const apps = await fetchZapierApps(limit, pages);
            return res.json({ target: 'https://zapier.com/api/v4/apps', count: apps.length, durationMs: Date.now() - start, apps });
        } catch (e: any) {
            return res.status(500).json({ error: e.message });
        }
    }
    let target = url;
    if (!target) {
        if (c === 'books') target = 'https://books.toscrape.com';
        else if (c === 'quotes') target = 'https://quotes.toscrape.com';
        else if (c === 'httpbin') target = 'https://httpbin.org/json';
        else target = 'https://crawlee.dev';
    }
    try {
        const start = Date.now();
        const data = await runCrawl(target, c || 'smoke');
        res.json({ target, count: data.length, durationMs: Date.now() - start, data });
    } catch (e: any) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[papa] listening on 0.0.0.0:${PORT} -> http://apify.beenex.org`);
});
