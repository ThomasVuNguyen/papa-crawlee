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
            <li><a href="/health">/health</a></li>
        </ul>
        <p>See <a href="https://github.com/apify/crawlee">crawlee.dev</a> • test cases in test.md</p>
    `);
});

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

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
