import { describe, expect, it } from "vitest";
import { inviteReadyStatus } from "./share-invite";

describe("inviteReadyStatus", () => {
  it("tells a connector they can earn after copy", () => {
    expect(inviteReadyStatus(true, true)).toMatch(/You earn if they Book/i);
    expect(inviteReadyStatus(true, false)).toMatch(/paste it wherever/i);
    expect(inviteReadyStatus(false, true)).toMatch(/select the link/i);
  });
});
