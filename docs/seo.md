<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# SEO & indexing

Public marketing surface is the landing page. Authenticated app routes are not meant for Google.

## Live endpoints

| URL | Purpose |
|-----|---------|
| https://philoxenia-iota.vercel.app/ | Indexable landing (roles + connector CTA) |
| https://philoxenia-iota.vercel.app/sitemap.xml | Sitemap |
| https://philoxenia-iota.vercel.app/robots.txt | Crawl rules |

## Implementation (`apps/web`)

| File | Role |
|------|------|
| `src/app/sitemap.ts` | Dynamic sitemap (landing only) |
| `src/app/robots.ts` | Allow `/`; disallow app paths; points to sitemap |
| `src/lib/site.ts` | `SITE_URL` / description (override with `NEXT_PUBLIC_SITE_URL`) |
| `src/lib/seo.ts` | Root metadata: Open Graph, Twitter, keywords, canonical |
| `src/lib/json-ld.ts` | JSON-LD Organization + WebSite + SoftwareApplication |
| `src/app/page.tsx` | Landing copy + connector incentive + JSON-LD script |

## After deploy

1. Confirm `/robots.txt` and `/sitemap.xml` return 200.
2. [Google Search Console](https://search.google.com/search-console) → add property `https://philoxenia-iota.vercel.app` → submit sitemap `https://philoxenia-iota.vercel.app/sitemap.xml`.
3. Request indexing for the homepage URL.

## Related

- [roles.md](./roles.md)
- [connectors.md](./connectors.md)
- [deployment-vercel.md](./deployment-vercel.md)
