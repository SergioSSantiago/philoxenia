<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Invitations

Connectors introduce guests to host listings via **opaque share links**. Several people can share the same listing; each link carries its own connector.

## Flow

```
Host or friend of host
      │
      ├── POST /listings/:id/share
      │     host share  → connectorId = null (shareable, no reward)
      │     friend share → connectorId = sharer (reward wallet)
      │
      └── /invite/:token ──► guest
                               │
                               ├── must be friend of host (or request friendship)
                               ├── records share_introduction (last link wins)
                               └── after friendship → view + book
```

## Multi-connector attribution

- Many active shares can exist for one listing (one per share action).
- When a logged-in guest opens a link, `share_introductions` for `(guest, listing)` is **upserted** to that share’s connector (last-touch).
- At booking, `resolveConnectorForBooking` reads that introduction:
  - `connectorId` null (host link) → direct booking, 0% connector
  - connector still friends with host → that connector earns the reward on settle
  - connector no longer friends with host → treated as no connector

## Share link properties

| Property | Value |
|----------|-------|
| Token | Cryptographically opaque |
| Expiry | 30 days |
| Status | `active`, `expired`, or `revoked` |
| URL | `/invite/{token}` |

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/listings/:id/share` | Yes | Create share; returns `hasConnector` |
| GET | `/invite/:token` | Optional | Resolve invite; records introduction if logged in |

## Invite gate

1. Guest opens link.
2. If already friends with host → listing opens.
3. If not → request friendship with host; after accept, listing unlocks.
4. Display name is cosmetic; rewards always go to the connector **wallet**.

## Related

- [social-graph.md](./social-graph.md)
- [bookings.md](./bookings.md)
