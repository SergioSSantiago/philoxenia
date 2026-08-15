<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Smart contracts

Philoxenia's on-chain surface is a single escrow **class** deployed once per payment token.

| Escrow | Mainnet |
|--------|---------|
| STRK | [`0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd`](https://voyager.online/contract/0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd) |
| DAI | [`0x00dc7fe1d48edba335f78b2b3155c599d04783623c5e6ecc83ea4da1d1618004`](https://voyager.online/contract/0x00dc7fe1d48edba335f78b2b3155c599d04783623c5e6ecc83ea4da1d1618004) |

Full deploy notes in [deploy-escrow.md](./deploy-escrow.md).

## BookingEscrow

**Source:** `contracts/src/booking_escrow.cairo`  
**Tooling:** Scarb 2.12, OpenZeppelin ERC20 2.0, Starknet Foundry tests

### Constructor

```cairo
constructor(token: ContractAddress, owner: ContractAddress, protocol_treasury: ContractAddress)
```

- `token` — ERC20 used for funding and settlement (STRK or DAI per deployment)
- `owner` — backup for settle/refund; may also create bookings
- `protocol_treasury` — receives Philoxenia’s 10% of connector rewards

### Booking struct

| Field | Type | Description |
|-------|------|-------------|
| `booking_id` | u256 | Unique booking identifier |
| `listing_id` | u256 | Opaque listing reference |
| `host`, `guest`, `connector` | ContractAddress | Parties (`connector` may be zero) |
| `total_amount` | u256 | Guest payment |
| `host_amount` | u256 | Host share |
| `connector_amount` | u256 | Connector net (after protocol take) |
| `protocol_amount` | u256 | 10% of connector reward (0 if no connector) |
| `connector_reward_bps` | u16 | Internal: percent × 100 (UI shows %) |
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
    fn get_protocol_treasury(self) -> ContractAddress;
    fn get_protocol_take_bps(self) -> u16; // always 1000 (= 10%)
}
```

### Access control

| Function | Authorized caller |
|----------|-------------------|
| `create_booking` | Guest (for their booking) or owner |
| `fund_booking` | Guest (via ERC20 `transfer_from`) |
| `settle_booking` | Guest or owner |
| `refund_booking` | Host or owner |

### Fee math (UI uses %; contract uses bps)

```
# With connector (reward_percent from listing, e.g. 5% → 500 bps):
connector_gross = total × reward_bps / 10000
protocol_amount = connector_gross × 1000 / 10000   # 10% of connector reward
connector_amount = connector_gross − protocol_amount
host_amount = total − connector_gross

# Without connector (connector = 0 or reward = 0%):
host_amount = total
connector_amount = 0
protocol_amount = 0
```

### Events

- `BookingCreated`, `BookingFunded`, `BookingSettled`, `BookingRefunded`

## Tests

```bash
cd contracts && scarb test
```

- With connector: 750 STRK, 5% → host 712.5, connector 33.75, protocol 3.75
- Direct booking: host 750, protocol 0

## Build

```bash
cd contracts
scarb build
```

## Deployment

**Mainnet:** see [deploy-escrow.md](./deploy-escrow.md) for the live address and constructor args.

Guest payment multicall: `create_booking` + `approve` + `fund_booking`.

## Related

- [bookings.md](./bookings.md)
- [payments.md](./payments.md)
- [product.md](./product.md)
