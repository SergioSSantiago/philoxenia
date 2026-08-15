import { describe, it, expect } from "vitest";
import {
  countryFromLocation,
  looksLikePostalCode,
  hasActivePaidNights,
} from "../lib/geo.js";

describe("countryFromLocation", () => {
  it("extracts Spain and Switzerland from Nominatim labels", () => {
    expect(
      countryFromLocation(
        "Carrer de la Creu, Raval, Cullera, La Ribera Baixa, Valencia, Comunidad Valenciana, 46400, España"
      )
    ).toBe("spain");
    expect(
      countryFromLocation(
        "5, Chemin de Chandolin, Lausana, District de Lausanne, Valdia, 1005, Suiza"
      )
    ).toBe("switzerland");
  });

  it("counts only two unique countries for live Philoxenia listings", () => {
    const locations = [
      "5, Chemin de Chandolin, Lausana, District de Lausanne, Valdia, 1005, Suiza",
      "Carrer de la Creu, Raval, Cullera, La Ribera Baixa, Valencia, Comunidad Valenciana, 46400, España",
      "45, Avenue des Collèges, Château-Sec, Pully, District de Lavaux-Oron, Valdia, 1009, Suiza",
      "Benejúzar, La Vega Baja, Alicante, Comunidad Valenciana, 03390, España",
    ];
    const set = new Set(
      locations.map((l) => countryFromLocation(l)).filter(Boolean)
    );
    expect(set.size).toBe(2);
    expect(set.has("spain")).toBe(true);
    expect(set.has("switzerland")).toBe(true);
  });

  it("does not treat letter-only country names as postcodes", () => {
    expect(looksLikePostalCode("Suiza")).toBe(false);
    expect(looksLikePostalCode("España")).toBe(false);
    expect(looksLikePostalCode("1005")).toBe(true);
    expect(looksLikePostalCode("46400")).toBe(true);
  });
});

describe("hasActivePaidNights", () => {
  it("blocks delete when a paid night is today or future", () => {
    expect(
      hasActivePaidNights(
        ["2026-08-20", "2026-08-21"],
        "2026-08-22",
        "2026-08-15"
      )
    ).toBe(true);
  });

  it("allows delete when all paid nights are in the past", () => {
    expect(
      hasActivePaidNights(
        ["2026-07-01", "2026-07-02"],
        "2026-07-03",
        "2026-08-15"
      )
    ).toBe(false);
  });

  it("treats today as active", () => {
    expect(
      hasActivePaidNights(["2026-08-15"], "2026-08-16", "2026-08-15")
    ).toBe(true);
  });
});
