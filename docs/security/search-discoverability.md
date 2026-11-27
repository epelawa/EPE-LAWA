# Search discoverability across engines

EPE LAWA uses crawler-neutral technical SEO: server-rendered public content, route-specific titles/descriptions and canonicals, structured data where appropriate, a sitemap of public canonical URLs, and a robots policy that excludes private areas. The shared `User-agent: *` robots rules and XML sitemap are not Google-specific; engines including Google, Microsoft Bing, DuckDuckGo, Brave Search and Ecosia can discover the same intended public pages. Crawl and ranking decisions remain independent for each engine. Firefox/Mozilla is a browser ecosystem, not a web-search crawler.

The sitemap is served only when the production indexing gate allows it. It contains the public route list and bounded published-detail URLs for news articles, tourism destinations, businesses and people profiles. Private administration routes and contributor/staff submission records are excluded; database reads use the public article and security-invoker views or the public tourism read policy.

For campaign links, use standard UTM parameters, for example:

```text
https://epelawa.vercel.app/?utm_source=google&utm_medium=cpc&utm_campaign=epe_lawa_search
```

The app recognizes a limited set of known referral labels and normalizes the legacy `next-utmfrom` spelling to `utm_source`. Attribution values are never used as redirect destinations. Keep `next` as a separate, same-origin application path; external return URLs are rejected.

Search-engine verification requires the site owner's token from that engine's webmaster console. Configure only genuine tokens using the matching supported environment variable (`GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`, or `YANDEX_SITE_VERIFICATION`); never publish fabricated verification tags. Bing's `msvalidate.01` meta tag is already supported by the shared site metadata helper. Do not invent engine-specific verification methods for platforms without a configured owner token; the common sitemap and robots documents remain available to all crawlers. No technical change can guarantee a ranking position—relevance, content quality, links, crawl access, and each engine's systems also matter.
