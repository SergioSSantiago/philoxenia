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

## Google Search Console verification

HTML file (file method): served at `/googlecbfc040f934ed5ea.html` (route + `public/` copy).

Preferred fallback — **Balise meta HTML**:

1. In Search Console choose *Balise meta* (not fichier HTML).
2. Copy only the `content="…"` value.
3. Set Vercel env `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` on the **philoxenia** web project.
4. Redeploy, then click Valider.

Property URL must be exactly: `https://philoxenia-iota.vercel.app` (https, no `www`).


## Related

- [roles.md](./roles.md)
- [connectors.md](./connectors.md)
- [deployment-vercel.md](./deployment-vercel.md)
