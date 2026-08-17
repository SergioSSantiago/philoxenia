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
| `src/lib/site.ts` | `SITE_URL` / description (guests Book & pay STRK or DAI; override with `NEXT_PUBLIC_SITE_URL`) |
| `src/lib/seo.ts` | Root metadata: Open Graph, Twitter, keywords, canonical |
| `src/lib/json-ld.ts` | JSON-LD Organization + WebSite + SoftwareApplication (feature list: **Guest Book & pay** STRK or DAI; 0% on direct Book & pay) |
| `src/app/page.tsx` | Landing copy + connector incentive + JSON-LD script |

## Google Search Console verification

Meta tag (active): `google-site-verification` =
`TeawpssVmF3RttfQltFkW2bjWRkyNT9Mw_ZMyMuPRK4` via Next.js `metadata.verification`
in `src/lib/seo.ts` (emitted on every page `<head>`, including the homepage).

HTML file method is also still served at `/googlecbfc040f934ed5ea.html` as a backup.

Property URL must be exactly: `https://philoxenia-iota.vercel.app` (https, no `www`).

After deploy: confirm the meta appears in View Source on `/`, then click **Valider** in Search Console. Then submit sitemap `https://philoxenia-iota.vercel.app/sitemap.xml`.


## Related

- [roles.md](./roles.md)
- [connectors.md](./connectors.md)
- [deployment-vercel.md](./deployment-vercel.md)
