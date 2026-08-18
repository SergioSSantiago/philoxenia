"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

export type MapLocationValue = {
  label: string;
  lat: number;
  lng: number;
};

type SearchHit = {
  display_name: string;
  lat: string;
  lon: string;
};

async function searchPlaces(query: string): Promise<SearchHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error("Could not find that place");
  return res.json();
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function LocationMapPicker({
  value,
  onChange,
}: {
  value: MapLocationValue | null;
  onChange: (next: MapLocationValue) => void;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!mapEl.current || mapRef.current) return;
      const L = (await import("leaflet")).default;

      // Fix default marker icons under bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (cancelled || !mapEl.current) return;

      const start = value
        ? { lat: value.lat, lng: value.lng }
        : { lat: 41.9028, lng: 12.4964 };

      const map = L.map(mapEl.current, {
        center: [start.lat, start.lng],
        zoom: value ? 14 : 5,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const placeMarker = async (lat: number, lng: number, label?: string) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(
            map
          );
          markerRef.current.on("dragend", async () => {
            const pos = markerRef.current!.getLatLng();
            const name = await reverseGeocode(pos.lat, pos.lng);
            onChange({ label: name, lat: pos.lat, lng: pos.lng });
          });
        }
        map.setView([lat, lng], Math.max(map.getZoom(), 14));
        const name = label ?? (await reverseGeocode(lat, lng));
        onChange({ label: name, lat, lng });
      };

      map.on("click", (e) => {
        void placeMarker(e.latlng.lat, e.latlng.lng);
      });

      if (value) {
        markerRef.current = L.marker([value.lat, value.lng], {
          draggable: true,
        }).addTo(map);
        markerRef.current.on("dragend", async () => {
          const pos = markerRef.current!.getLatLng();
          const name = await reverseGeocode(pos.lat, pos.lng);
          onChange({ label: name, lat: pos.lat, lng: pos.lng });
        });
      }

      mapRef.current = map;
      // Expose helper for search selection
      (
        map as LeafletMap & {
          __place?: (lat: number, lng: number, label: string) => void;
        }
      ).__place = (lat, lng, label) => {
        void placeMarker(lat, lng, label);
      };
    }

    void init();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // intentionally mount-once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    const q = query.trim();
    if (q.length < 3) {
      setError("Type at least 3 characters to search");
      return;
    }
    setSearching(true);
    try {
      const results = await searchPlaces(q);
      setHits(results);
      if (results.length === 0) {
        setError("No places found — try a more specific address");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find that place");
      setHits([]);
    } finally {
      setSearching(false);
    }
  }

  function selectHit(hit: SearchHit) {
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    const map = mapRef.current as
      | (LeafletMap & {
          __place?: (lat: number, lng: number, label: string) => void;
        })
      | null;
    map?.__place?.(lat, lng, hit.display_name);
    setHits([]);
    setQuery(hit.display_name);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">Location on map</p>
        <p className="mt-0.5 text-xs text-muted">
          Search an address, then click the map or drag the pin. Friends see
          this pin on Home to Book & pay — it is not a public directory.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void runSearch();
            }
          }}
          placeholder="Search city, street, or place…"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={searching}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-medium disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {hits.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          {hits.map((hit) => (
            <li key={`${hit.lat},${hit.lon},${hit.display_name}`}>
              <button
                type="button"
                className="block w-full border-b border-border px-4 py-3 text-left text-sm last:border-b-0 hover:bg-background"
                onClick={() => selectHit(hit)}
              >
                {hit.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        ref={mapEl}
        className="h-72 w-full overflow-hidden rounded-2xl border border-border z-0"
      />

      {value ? (
        <p className="text-xs text-muted leading-relaxed">
          <span className="font-medium text-foreground">Pinned:</span>{" "}
          {value.label}
          <span className="mt-1 block font-mono">
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </span>
        </p>
      ) : (
        <p className="text-xs text-muted">No pin yet — click the map.</p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
