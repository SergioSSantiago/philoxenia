<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Smart contracts

Philoxenia's on-chain surface is a single escrow **class** deployed once per payment token.

| Escrow | Mainnet |
|--------|---------|
| STRK | [`0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3`](https://voyager.online/contract/0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3) |
| DAI | [`0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712`](https://voyager.online/contract/0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712) |
| **Anonymizer** | [`0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb`](https://voyager.online/contract/0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb) |

Classes verified on Voyager: [escrow](https://voyager.online/class/0x026a90e91e9e50f5a91cda8b4e40a4008de2a47658758374d170823014c4fd24) · [anonymizer](https://voyager.online/class/0x05ba21cfac1ce24c0b25330d24749c03223046b6ec3a4beb790ad9f23054599e).

Full deploy notes in [deploy-escrow.md](./deploy-escrow.md).

## BookingEscrow

**Source:** `contracts/src/booking_escrow.cairo`  
**Tooling:** Scarb 2.12, OpenZeppelin ERC20 2.0, Starknet Foundry tests

### Constructor (v2 source)

```cairo
constructor(
    token: ContractAddress,
    owner: ContractAddress,
    protocol_treasury: ContractAddress,
    anonymizer: ContractAddress, // zero or BookingEscrowAnonymizer
)
```

- `token` — ERC20 used for funding and settlement (STRK or DAI per deployment)
- `owner` — backup for settle/refund; may also create bookings
- `protocol_treasury` — receives Philoxenia’s 10% of connector rewards
- `anonymizer` — STRK20 helper allowed to create/fund/settle for a guest (may be zero)
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
    fn set_anonymizer(ref self, anonymizer);
    fn get_booking(self, booking_id) -> Booking;
    fn get_protocol_treasury(self) -> ContractAddress;
    fn get_protocol_take_bps(self) -> u16; // always 1000 (= 10%)
    fn get_anonymizer(self) -> ContractAddress;
}
```

### Access control

| Function | Authorized caller |
|----------|-------------------|
| `create_booking` | Guest, owner, or anonymizer |
| `fund_booking` | Guest or anonymizer (`transfer_from` caller) |
| `settle_booking` | Guest, owner, or anonymizer |
| `refund_booking` | Host or owner |
| `set_anonymizer` | Owner |
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
