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

To book a listing, the guest must:

1. Be able to view it (friend of host), **and**
2. Have a valid connector introduction for that listing (unless they are a direct friend who books without going through a share — connector resolution still requires an introduction record for non-friend paths; direct friends booking still needs connector from introduction or the booking will fail with "No valid connector found")

**Note:** Direct friends of the host can view listings but booking requires a `share_introductions` record linking them as guest with a connector who is friends with the host. In practice, a friend booking directly may need a share flow or seed data. This is an MVP edge case.

Actually let me re-read resolveConnectorForBooking - it requires share_introductions. So even friends need an introduction? Let me check createBooking again...

```javascript
const connectorId = await resolveConnectorForBooking(
  guestId,
  listing.id,
  listing.hostId
);

if (!connectorId) {
  throw new Error("No valid connector found for this booking");
}
```

And resolveConnectorForBooking only looks at share_introductions. So direct friends who discover via network listings cannot book unless they have a share introduction. That's an MVP limitation I should document honestly.

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
