import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isMobileBrowser,
  philoxeniaOpenUrl,
  readyLegacySignRequestHref,
  readyMobileStoreHref,
  readySignRequestHref,
} from "./ready-mobile";

describe("ready-mobile helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects phone UAs", () => {
    vi.stubGlobal("navigator", {
      userAgent: "iPhone",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(isMobileBrowser()).toBe(true);
  });

  it("uses Play Store on Android and App Store otherwise", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Android",
      platform: "Linux",
      maxTouchPoints: 1,
    });
    expect(readyMobileStoreHref()).toMatch(/play.google.com/);
    vi.stubGlobal("navigator", {
      userAgent: "Macintosh",
      platform: "MacIntel",
      maxTouchPoints: 0,
    });
    expect(readyMobileStoreHref()).toMatch(/apps.apple.com/);
  });

  it("builds Ready WC deep links", () => {
    expect(readySignRequestHref()).toMatch(/^ready:\/\/app\/wc\/request/);
    expect(readyLegacySignRequestHref()).toMatch(/^argent:\/\/app\/wc\/request/);
    expect(philoxeniaOpenUrl()).toMatch(/\/home$/);
  });
});
