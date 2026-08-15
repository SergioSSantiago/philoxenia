#!/usr/bin/env bash
# Declare (WITH ABI) + deploy BookingEscrowAnonymizer + BookingEscrow v2 (STRK+DAI),
# then verify classes on Voyager.
#
# Prerequisite: deployer ≥ ~30 STRK
#   0x0507fb4beaabff016689be72df70ccc1b4eceb6a2238448328244de5001a19ee
set -euo pipefail
export PATH="$HOME/.starkli/bin:$HOME/.cargo/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$HOME/.starkli-wallets/deployer"
PASS=$(cat "$DIR/password.txt")
set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
# shellcheck disable=SC1091
source "$ROOT/contracts/deploy.env"
set +a
export STARKNET_RPC="${STARKNET_RPC:-https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_8/${ALCHEMY_API_KEY}}"

OWNER="${OWNER_ADDRESS:?}"
TREASURY="${PROTOCOL_TREASURY_ADDRESS:?}"
STRK="${STRK_TOKEN_ADDRESS:?}"
DAI="${DAI_TOKEN_ADDRESS:?}"
ADDR=$(cat "$DIR/address.txt")

# Sequencer-expected compiled class hashes for WITH-ABI Sierra (mainnet).
# If declare fails with Mismatch, paste the "Expected:" hash from the error here.
ANON_CASM="${ANON_CASM_HASH:-0x16ab27b9542c806a1c4f05e2a952451051fb04f36d6bfb9e4723ee798959543}"
ESC_CASM="${ESC_CASM_HASH:-0x115b804908de204c9ab5a7d44730a78fa3fe01f89d122b04915301157d9483b}"

cd "$ROOT/contracts"
scarb build
scarb test

bal_out=$(starkli call "$STRK" balanceOf "$ADDR" --rpc "$STARKNET_RPC" 2>&1)
python3 -c "low=int('''$bal_out'''.split('\"')[1],16); print(f'deployer_balance={low/1e18:.4f} STRK'); import sys; sys.exit(0 if low>=28e18 else 1)" \
  || { echo "Need ≥ ~30 STRK on $ADDR"; exit 1; }

declare_with_abi() {
  local artifact="$1"
  local casm="$2"
  local label="$3"
  echo "=== DECLARE $label (WITH ABI) ==="
  # Cap max fee under balance; bump if ValidationFailure on insufficient gas.
  starkli declare "$artifact" \
    --casm-hash "$casm" \
    --account "$DIR/account.json" \
    --keystore "$DIR/keystore.json" \
    --keystore-password "$PASS" \
    --rpc "$STARKNET_RPC" \
    -w | tee "/tmp/philoxenia-declare-${label}.log"
}

# Prefer auto fee when balance is healthy; fall back to manual bounds if needed.
declare_with_abi \
  target/dev/philoxenia_contracts_BookingEscrowAnonymizer.contract_class.json \
  "$ANON_CASM" \
  anonymizer

ANON_CLASS=$(rg -N 'Class hash declared:' -A1 /tmp/philoxenia-declare-anonymizer.log | rg -o '0x[0-9a-fA-F]+' | tail -1)
echo "Anonymizer class: $ANON_CLASS"

echo "=== DEPLOY anonymizer ==="
starkli deploy "$ANON_CLASS" \
  --account "$DIR/account.json" \
  --keystore "$DIR/keystore.json" \
  --keystore-password "$PASS" \
  --rpc "$STARKNET_RPC" \
  -w | tee /tmp/philoxenia-deploy-anonymizer.log
ANON=$(rg -o 'Contract deployed:\n0x[0-9a-fA-F]+' -U /tmp/philoxenia-deploy-anonymizer.log | rg -o '0x[0-9a-fA-F]+' | tail -1)
# fallback parse
if [ -z "$ANON" ]; then
  ANON=$(rg -N 'Contract deployed:' -A1 /tmp/philoxenia-deploy-anonymizer.log | rg -o '0x[0-9a-fA-F]+' | tail -1)
fi
echo "Anonymizer: $ANON"

declare_with_abi \
  target/dev/philoxenia_contracts_BookingEscrow.contract_class.json \
  "$ESC_CASM" \
  escrow

ESC_CLASS=$(rg -N 'Class hash declared:' -A1 /tmp/philoxenia-declare-escrow.log | rg -o '0x[0-9a-fA-F]+' | tail -1)
echo "Escrow class: $ESC_CLASS"

echo "=== DEPLOY STRK escrow (token, owner, treasury, anonymizer) ==="
starkli deploy "$ESC_CLASS" "$STRK" "$OWNER" "$TREASURY" "$ANON" \
  --account "$DIR/account.json" \
  --keystore "$DIR/keystore.json" \
  --keystore-password "$PASS" \
  --rpc "$STARKNET_RPC" \
  -w | tee /tmp/philoxenia-deploy-escrow-strk.log
STRK_ESCROW=$(rg -N 'Contract deployed:' -A1 /tmp/philoxenia-deploy-escrow-strk.log | rg -o '0x[0-9a-fA-F]+' | tail -1)

echo "=== DEPLOY DAI escrow ==="
starkli deploy "$ESC_CLASS" "$DAI" "$OWNER" "$TREASURY" "$ANON" \
  --account "$DIR/account.json" \
  --keystore "$DIR/keystore.json" \
  --keystore-password "$PASS" \
  --rpc "$STARKNET_RPC" \
  -w | tee /tmp/philoxenia-deploy-escrow-dai.log
DAI_ESCROW=$(rg -N 'Contract deployed:' -A1 /tmp/philoxenia-deploy-escrow-dai.log | rg -o '0x[0-9a-fA-F]+' | tail -1)

echo "=== VOYAGER VERIFY ==="
voyager verify --network mainnet \
  --path "$ROOT/contracts" \
  --class-hash "$ANON_CLASS" \
  --contract-name BookingEscrowAnonymizer \
  --license MIT \
  --lock-file \
  --watch | tee /tmp/philoxenia-voyager-anon.log

voyager verify --network mainnet \
  --path "$ROOT/contracts" \
  --class-hash "$ESC_CLASS" \
  --contract-name BookingEscrow \
  --license MIT \
  --lock-file \
  --watch | tee /tmp/philoxenia-voyager-escrow.log

OUT="$ROOT/contracts/.deploy/mainnet-v2.json"
cat > "$OUT" <<EOF
{
  "network": "mainnet",
  "withAbi": true,
  "anonymizer": {
    "address": "$ANON",
    "classHash": "$ANON_CLASS"
  },
  "strkEscrow": {
    "address": "$STRK_ESCROW",
    "classHash": "$ESC_CLASS",
    "token": "$STRK"
  },
  "daiEscrow": {
    "address": "$DAI_ESCROW",
    "classHash": "$ESC_CLASS",
    "token": "$DAI"
  },
  "owner": "$OWNER",
  "protocolTreasury": "$TREASURY"
}
EOF

echo
echo "Wrote $OUT"
echo "Set on Vercel + .env:"
echo "  NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS=$ANON"
echo "  NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS=$STRK_ESCROW"
echo "  NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS=$DAI_ESCROW"
