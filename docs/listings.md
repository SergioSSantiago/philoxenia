<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Listings

Hosts create **private listings** visible only to themselves and their friends.

## Listing fields

| Field | Description |
|-------|-------------|
| `title`, `description` | Basic listing info |
| `location`, `locationLat`, `locationLng` | Human-readable place + required map pin (WGS84) |
| `pricePerNight` | Decimal string **denominated in DAI**; guests may pay that amount in DAI or STRK |
| `minStay`, `maxStay` | Derived from the availability window (not host-entered) |
| `cancellationTerms` | Off-chain policy text (not enforced by escrow) |
| `connectorRewardPercent` | 0–100; connector's share when an introduction exists |
| `photos` | 1–8 compressed images (data URLs or https) |
| `availability` | Required date range |

## Cancellation vs escrow

`cancellationTerms` are **not** encoded in `BookingEscrow`. On-chain, after funding:

- Guest (or owner) calls `settle_booking`
- Host (or owner) calls `refund_booking`

Honouring the written policy is social/off-chain until automated rules are added.

## Visibility

```
Host ──always──► own listings
Friend of host ──► can view + share
Everyone else ──► 404 (listing unavailable)
```

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/my-listings` | Yes | Create listing (map pin + photos required) |
| GET | `/my-listings` | Yes | Host's own listings |
| GET | `/my-network/listings` | Yes | Friends' listings |
| GET | `/shared-listings` | Yes | Listings shared with user via introductions |
| GET | `/listings/:id` | Yes | Detail (if authorized) |
| POST | `/listings/:id/share` | Yes | Generate invite link |

## Related

- [invitations.md](./invitations.md)
- [bookings.md](./bookings.md)
