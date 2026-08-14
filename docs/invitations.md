<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Invitations

Connectors introduce guests to host listings via **opaque share links**.

## Flow

```
Friend of host                Guest (stranger)
      │                              │
      ├── POST /listings/:id/share ──┤
      │   (generates token)          │
      │                              │
      └── share URL /invite/:token ─► opens invite page
                                       │
                                       ├── creates share_introduction (if logged in)
                                       ├── prompts friend request to host
                                       └── after acceptance → can view + book
```

## Share link properties

| Property | Value |
|----------|-------|
| Token | Cryptographically opaque (`generateOpaqueToken`) |
| Expiry | 30 days from creation |
| Status | `active`, `expired`, or `revoked` |
| URL format | `/invite/{token}` (web route) |

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/listings/:id/share` | Yes | Create share (connector must be host or friend) |
| GET | `/invite/:token` | Optional | Resolve invite; records introduction if guest is logged in |

### Invite resolution response

```typescript
{
  shareId, listingId, hostId, connectorId,
  host, connector,           // user objects
  canViewListing,            // true if guest is already friend of host
  friendshipRequired,        // true if not yet friends
  friendshipPending          // true if request already sent
}
```

## Connector attribution

When a logged-in guest opens an invite and is **not** yet friends with the host:

1. A `share_introductions` row is inserted (idempotent on guest + listing).
2. This links `guestId`, `connectorId`, `hostId`, `listingId`.
3. At booking time, `resolveConnectorForBooking` uses this record and verifies the connector is still friends with the host.

If the connector unfriends the host before booking, the connector is invalidated and booking fails.

## MVP limitations

- **Booking requires an introduction record** — guests who discover a listing only via the friends network (without opening a share link) cannot book until a share introduction exists.
- Share revocation UI is not implemented (status can be set to `revoked` in DB manually).
- Invite page works without auth but introduction is only recorded for logged-in users.

## Implementation status

| Feature | Status |
|---------|--------|
| Share creation | Implemented |
| Token expiry | Implemented |
| Introduction tracking | Implemented |
| Guest onboarding UX | Implemented (web `/invite/[token]`) |
| Email / SMS invites | Not implemented |

## Related

- [social-graph.md](./social-graph.md)
- [bookings.md](./bookings.md)
