<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Listings

Hosts create **private listings** visible only to themselves and their friends.

## Listing fields

| Field | Description |
|-------|-------------|
| `title`, `description`, `location` | Basic listing info |
| `pricePerNight` | Decimal string (18 decimals for on-chain alignment) |
| `paymentAsset` | `STRK` or `DAI` |
| `minStay`, `maxStay` | Night limits |
| `cancellationTerms` | Free-text policy |
| `connectorRewardPercent` | 0–100; connector's share of total booking |
| `photos` | URL array (stored as text; no upload service in MVP) |
| `availability` | Optional date ranges |

## Visibility

```
Host ──always──► own listings
Friend of host ──► can view + share
Everyone else ──► 404 (listing unavailable)
```

There is no public listing index. Unauthorized requests receive `"Listing unavailable."` — the API does not confirm existence.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/my-listings` | Yes | Create listing |
| GET | `/my-listings` | Yes | Host's own listings |
| GET | `/my-network/listings` | Yes | Friends' listings |
| GET | `/shared-listings` | Yes | Listings shared with user via introductions |
| GET | `/listings/:id` | Yes | Detail (if authorized) |
| POST | `/listings/:id/share` | Yes | Generate invite link |

## Sharing

Any authorized viewer (host or friend) can create a share link. See [invitations.md](./invitations.md).

## Booking prerequisites

To book, the guest must be able to view the listing (friend of the host). Connector attribution comes from a `share_introductions` row (the friend who shared the invite).

**MVP limitation:** Direct friends who only saw the listing on the network feed still need an introduction record to book. Without it, booking fails with "No valid connector found." Use a share link (or seed data) until that path is opened.

## Implementation status

| Feature | Status |
|---------|--------|
| CRUD via API | Create + read implemented; no update/delete endpoints |
| Availability windows | Stored; overlap validation on booking |
| Photo upload | URLs only; no storage backend |
| On-chain listing registry | Not implemented |

## Related

- [invitations.md](./invitations.md)
- [bookings.md](./bookings.md)
