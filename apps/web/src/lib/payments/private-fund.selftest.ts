/**
 * Unit checks for private fund: wallet-felt encoding + settle-all anonymizer shape.
 * Run: npx tsx apps/web/src/lib/payments/private-fund.selftest.ts
 */
import { CallData, cairo } from "starknet";
import assert from "node:assert/strict";
import { toWalletCalldata, toWalletFelt } from "./private-escrow-fund";

const ESCROW =
  "0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3";
const TOKEN =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const ANON =
  "0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb";
const HOST =
  "0x04746642f27C03a5d3706205E8d6fbFEd30d18Ed6bE45584BB2df5a65388E878";
const GUEST =
  "0x04912f27036fd23f51cb9cfe719ea0d875bfc462b5f2af8f110a3b1832bb2f59";

const amount = 1_304_175_370_000_000_000n;

const compiled = CallData.compile({
  escrow: ESCROW,
  token: TOKEN,
  booking_id: cairo.uint256(4082228712090190889n),
  listing_id: cairo.uint256(1n),
  host: HOST,
  guest: GUEST,
  connector: "0x0",
  total_amount: cairo.uint256(amount),
  connector_reward_bps: 0,
});

assert.ok(
  compiled.some((v) => typeof v === "string" && !String(v).startsWith("0x")),
  "CallData.compile should produce decimal strings (why we re-encode)"
);

// Settle-all: no OPEN note — note_id is 0x0 (unused when leftover span is empty).
const calldata = toWalletCalldata([...compiled, "0x0"]);

assert.equal(calldata[calldata.length - 1], "0x0");
assert.ok(calldata.length >= 10, "expected full privacy_invoke args");
assert.equal(BigInt(calldata[0]), BigInt(ESCROW));
assert.equal(BigInt(calldata[1]), BigInt(TOKEN));
for (const item of calldata) {
  assert.match(item, /^0x[0-9a-f]+$/i, `felt must be 0x-hex: ${item}`);
}

assert.equal(toWalletFelt("1000"), "0x3e8");

const actions = [
  {
    type: "withdraw",
    token: TOKEN,
    amount: toWalletFelt(amount),
    recipient: ANON,
  },
  { type: "invoke", contract: ANON, calldata },
];
assert.equal(actions.length, 2);
assert.equal(actions[0].type, "withdraw");
assert.equal(actions[1].type, "invoke");
assert.ok(!actions.some((a) => a.type === "transfer"));

console.log("private-fund.selftest OK", {
  invokeCalldataLen: calldata.length,
  sampleFelt: calldata[0],
  actions: actions.map((a) => a.type),
});
