<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# BookingEscrow on Starknet mainnet

**Status: live**

| Field | Value |
|-------|--------|
| Contract | [`0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd`](https://voyager.online/contract/0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd) |
| Class hash | `0x070a12ef9f69b913cc7e6bf4bf9dabc6cf5db843acea86d72493e9d883d671db` |
| Network | Starknet mainnet |
| Token | STRK — `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| Owner | `0x04746642f27C03a5d3706205E8d6fbFEd30d18Ed6bE45584BB2df5a65388E878` |
| Protocol treasury | same as owner |
| Protocol take | **10%** of the connector reward (`1000` bps). **0%** if there is no connector. |

Env var (web): `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS`

## Fee examples

**With connector** (750 STRK total, 5% connector reward):

| Party | Amount |
|-------|--------|
| Host | 712.5 STRK |
| Connector (net) | 33.75 STRK |
| Philoxenia | 3.75 STRK |

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

1. `token` — STRK
2. `owner` — admin (settle/refund backup)
3. `protocol_treasury` — receives 10% of connector rewards

```bash
export STARKNET_RPC="https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/$ALCHEMY_API_KEY"

starkli declare target/dev/philoxenia_contracts_BookingEscrow.contract_class.json
starkli deploy <CLASS_HASH> <STRK_TOKEN> <OWNER> <PROTOCOL_TREASURY>
```

Then set `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` on Vercel and redeploy the web app.
