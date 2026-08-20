<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="72" height="72" />
</p>

# Philoxenia docs

Book & pay with people you trust on Starknet. **Trust who you trust. Pay trustless.**

## For everyone

**Problem:** friend stays are either put on Airbnb (public, expensive) or settled over chat (awkward, unprotected).

**Philoxenia:** hospitality among people you already trust — listings stay in your circle, money settles in a smart contract, payments can stay private (STRK20). Direct stays: **0% protocol fee**. A connector earns by introducing a guest; that is how the network grows without a public search.

See the comparison in the [root README](../README.md#why-philoxenia-instead-of-airbnb).

## Demo (live + hackathon)

| | URL |
|--|-----|
| App | https://philoxenia-iota.vercel.app |
| Demo page | https://philoxenia-iota.vercel.app/demo |
| Commercial video (MP4) | https://philoxenia-iota.vercel.app/demo/philoxenia-commercial.mp4 |

The video walks Home listings (real place photos), place detail, Friends, Earnings, Messages, Bookings, and Ready X private pay. Submission fields for the STRK20 hub are in root [`strk20.json`](../strk20.json) (`demo_url`, `demo_video`, `contracts`, `transactions`). Happy-path checklist: [demo-checklist.md](./demo-checklist.md).

## Privacy stack

| Technology | What it does in Philoxenia |
|------------|---------------------------|
| **STRK20 + Ready X** | Shield/unshield, private Book & pay, private chat sends |
| **AVNU** | Private STRK ↔ DAI swap in the pool |
| **BookingEscrow anonymizer** | Private fund into escrow |
| **MessageMailbox** | On-chain anchor for sealed notes |

See [strk20.md](./strk20.md) · [payments.md](./payments.md) · [privacy.md](./privacy.md)

| Doc | Topic |
|-----|--------|
| [brand.md](./brand.md) | Logo (sleeping-head cameo) and header → `/` |
| [product.md](./product.md) | Product — Ready X: Chrome (desktop) / Ready X app browser (iPhone); Firefox has no Ready X |
| [roles.md](./roles.md) | **Host · Guest · Connector** — why connector grows the app |
| [connectors.md](./connectors.md) | **Earn as a connector** — key growth loop, Earnings UI, share surfaces |
| [architecture.md](./architecture.md) | Monorepo, pages, data flow |
| [social-graph.md](./social-graph.md) | Friends; friend profile; search by Ready X wallet only |
| [listings.md](./listings.md) | Private places |
| [invitations.md](./invitations.md) | Share links |
| [bookings.md](./bookings.md) | Verified pay; social cancel (no clawback) |
| [demo-checklist.md](./demo-checklist.md) | Prod happy-path checklist |
| [messages.md](./messages.md) | Sealed DMs + peer DAI/STRK transfers |
| [message-mailbox.md](./message-mailbox.md) | On-chain MessageMailbox helper |
| [payments.md](./payments.md) | STRK / DAI / STRK20 / AVNU swap |
| [strk20.md](./strk20.md) | Privacy payments |
| [smart-contracts.md](./smart-contracts.md) | BookingEscrow interface |
| [deploy-escrow.md](./deploy-escrow.md) | **Live mainnet** STRK/DAI escrow + anonymizer + smoke tests |
| [booking-escrow-anonymizer.md](./booking-escrow-anonymizer.md) | privacy_invoke helper |
| [privacy.md](./privacy.md) | Privacy boundaries |
| [security.md](./security.md) | Auth (SNIP-12), threats |
| [development.md](./development.md) | Local setup |
| [deployment.md](./deployment.md) | Generic deploy |
| [deployment-vercel.md](./deployment-vercel.md) | Production on Vercel |
| [seo.md](./seo.md) | Sitemap, robots, Search Console |

Root summaries: [ARCHITECTURE.md](../ARCHITECTURE.md), [PRIVACY.md](../PRIVACY.md), [SECURITY.md](../SECURITY.md), [STRK20_INTEGRATION_PLAN.md](../STRK20_INTEGRATION_PLAN.md) (complete).

Hackathon submission fields live in repo-root [`strk20.json`](../strk20.json) (`demo_url`, `demo_video`, txs, contracts). The hub reads that file from the repo; keep `demo_video` as the absolute MP4 URL above.
