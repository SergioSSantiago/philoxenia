<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# BookingEscrow on Starknet mainnet

**Status: live** (STRK + DAI)

| Field | STRK escrow | DAI escrow |
|-------|-------------|------------|
| Contract | [`0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd`](https://voyager.online/contract/0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd) | [`0x00dc7fe1d48edba335f78b2b3155c599d04783623c5e6ecc83ea4da1d1618004`](https://voyager.online/contract/0x00dc7fe1d48edba335f78b2b3155c599d04783623c5e6ecc83ea4da1d1618004) |
| Class hash | `0x070a12ef9f69b913cc7e6bf4bf9dabc6cf5db843acea86d72493e9d883d671db` | same |
| Token | STRK `0x04718…` | DAI `0x00da11…` |
| Owner / treasury | `0x047466…` | same |
| Protocol take | **10%** of connector reward (`1000` bps); **0%** if no connector | same |

Env vars (web):

- `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` — STRK
- `NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS` — DAI

Guests choose STRK or DAI at pay time. List prices stay in DAI; STRK uses live FX.

## Fee examples

**With connector** (750 total, 5% connector reward):

| Party | Amount |
|-------|--------|
| Host | 712.5 |
| Connector (net) | 33.75 |
| Philoxenia | 3.75 |

**Direct booking** (no connector): host receives 100%; protocol 0%.

## Source & interface

- Cairo: [`contracts/src/booking_escrow.cairo`](../contracts/src/booking_escrow.cairo)
- Interface and access control: [smart-contracts.md](./smart-contracts.md)

## Redeploy / declare notes

Historical checklist for declare/deploy with starkli (only needed for a new deployment):

### Build

```bash
cd contracts
scarb build
scarb test
```

### Constructor

1. `token` — STRK or DAI
2. `owner` — admin (settle/refund backup)
3. `protocol_treasury` — receives 10% of connector rewards

```bash
export STARKNET_RPC="https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/$ALCHEMY_API_KEY"

starkli declare target/dev/philoxenia_contracts_BookingEscrow.contract_class.json
starkli deploy <CLASS_HASH> <TOKEN> <OWNER> <PROTOCOL_TREASURY>
```

Then set the matching `NEXT_PUBLIC_*_BOOKING_ESCROW_ADDRESS` on Vercel and redeploy the web app.
