# Deploy BookingEscrow (Starknet mainnet)

## Live mainnet deployment

| | |
|--|--|
| **BookingEscrow** | `0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd` |
| Class hash | `0x070a12ef9f69b913cc7e6bf4bf9dabc6cf5db843acea86d72493e9d883d671db` |
| Token (STRK) | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| Owner / treasury | `0x04746642f27C03a5d3706205E8d6fbFEd30d18Ed6bE45584BB2df5a65388E878` |
| Protocol take | **10%** of connector reward (`1000` bps) |

Voyager: https://voyager.online/contract/0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd

Env: `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` (Vercel web + local `.env`).

## Prerequisites

- [starkli](https://book.starkli.rs/) installed
- Funded Starknet account (Ready X or starkli keystore)
- STRK token (mainnet): `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`

## Build

```bash
cd contracts
scarb build
scarb test
```

Artifacts: `contracts/target/dev/philoxenia_contracts_BookingEscrow.*.json`

## Declare + deploy

Constructor args:

1. `token` — STRK (or DAI if you deploy a DAI escrow)
2. `owner` — admin wallet (settle/refund backup)
3. `protocol_treasury` — wallet that receives **10% of connector rewards**

Example with starkli (adjust paths/RPC):

```bash
export STARKNET_RPC="https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/$ALCHEMY_API_KEY"

starkli declare \
  target/dev/philoxenia_contracts_BookingEscrow.contract_class.json \
  --compiler-version 2.12.2

starkli deploy <CLASS_HASH> \
  <STRK_TOKEN> \
  <OWNER_ADDRESS> \
  <PROTOCOL_TREASURY_ADDRESS>
```

## After deploy

1. Set on Vercel (web project **philoxenia**):

   `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS=<deployed address>`

2. Redeploy web: `vercel deploy --prod --yes` from repo root.

3. Smoke-test on desktop Ready X: create booking → Pay (multicall create + approve + fund).

## Fee reminder

- Direct booking (no connector): protocol **0%**
- With connector: protocol **10% of connector reward** (UI shows %; contract uses bps)
