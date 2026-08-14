# Smart contracts

Philoxenia's on-chain surface is a single escrow contract for booking settlement.

## BookingEscrow

**Source:** `contracts/src/booking_escrow.cairo`  
**Tooling:** Scarb 2.12, OpenZeppelin ERC20 2.0, Starknet Foundry tests

### Constructor

```cairo
constructor(token: ContractAddress, owner: ContractAddress)
```

- `token` — ERC20 used for funding and settlement
- `owner` — can call `create_booking`, settle as backup, refund as backup

### Booking struct

| Field | Type | Description |
|-------|------|-------------|
| `booking_id` | u256 | Unique booking identifier |
| `listing_id` | u256 | Opaque listing reference |
| `host`, `guest`, `connector` | ContractAddress | Parties |
| `total_amount` | u256 | Guest payment |
| `host_amount`, `connector_amount` | u256 | Split after reward |
| `connector_reward_bps` | u16 | Basis points (500 = 5%) |
| `funded`, `settled`, `refunded` | bool | State flags |

### Interface

```cairo
trait IBookingEscrow {
    fn create_booking(ref self, booking_id, listing_id, host, guest, connector,
                      total_amount, connector_reward_bps);
    fn fund_booking(ref self, booking_id);
    fn settle_booking(ref self, booking_id);
    fn refund_booking(ref self, booking_id);
    fn get_booking(self, booking_id) -> Booking;
}
```

### Access control

| Function | Authorized caller |
|----------|-------------------|
| `create_booking` | Owner only |
| `fund_booking` | Guest (via ERC20 `transfer_from`) |
| `settle_booking` | Guest or owner |
| `refund_booking` | Host or owner |

### Reward math

```
connector_amount = total_amount × connector_reward_bps / 10000
host_amount = total_amount - connector_amount
```

Protocol fee: **0** (no third recipient).

### Events

- `BookingCreated`, `BookingFunded`, `BookingSettled`, `BookingRefunded`

## Tests

`contracts/tests/test_booking_escrow.cairo` verifies reward calculation:

- 750 STRK total, 500 bps (5%) → 712.5 host + 37.5 connector

Run:

```bash
cd contracts && scarb test
```

## Build

```bash
cd contracts
scarb build    # outputs Sierra/CASM artifacts
```

## Deployment

No deployment script is included in the MVP repo. Deploy manually:

1. Deploy test/production ERC20 (or use existing STRK)
2. Deploy `BookingEscrow` with token + owner addresses
3. Set `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` in `.env`
4. Owner must call `create_booking` for each off-chain booking before guest can `fund_booking`

See [deployment.md](./deployment.md).

## Integration gaps (MVP)

| Contract capability | App integration |
|--------------------|-----------------|
| `create_booking` | Not called from API/web |
| `fund_booking` | Called from public payment path only |
| `settle_booking` | Not exposed in UI/API |
| `refund_booking` | Not exposed in UI/API |
| STRK20 private notes | Escrow expects ERC20 `transfer_from`; private wallet transfers bypass escrow state |

## Future considerations

- Relayer service (owner) to batch `create_booking` from API events
- Or: allow host/guest to co-sign booking creation
- Anonymizer-based escrow for STRK20 compatibility (per upstream STRK20 docs)

## Related

- [bookings.md](./bookings.md)
- [payments.md](./payments.md)
- [strk20.md](./strk20.md)
