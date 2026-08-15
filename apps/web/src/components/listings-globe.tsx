"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import createGlobe from "cobe";
import type { Listing } from "@philoxenia/shared";

type GlobePoint = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  kind: "mine" | "friend" | "shared";
};

function toPoints(
  mine: Listing[],
  network: Listing[],
  shared: Listing[]
): GlobePoint[] {
  const byId = new Map<string, GlobePoint>();

  function add(list: Listing[], kind: GlobePoint["kind"]) {
    for (const l of list) {
      const lat = l.locationLat != null ? Number(l.locationLat) : NaN;
      const lng = l.locationLng != null ? Number(l.locationLng) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (byId.has(l.id)) continue;
      byId.set(l.id, {
        id: l.id,
        title: l.title,
        lat,
        lng,
        kind,
      });
    }
  }

  add(mine, "mine");
  add(network, "friend");
  add(shared, "shared");
  return [...byId.values()];
}

/**
 * Interactive WebGL globe of listings the viewer can access.
 */
export function ListingsGlobe({
  myListings,
  networkListings,
  sharedListings,
}: {
  myListings: Listing[];
  networkListings: Listing[];
  sharedListings: Listing[];
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useMemo(
    () => toPoints(myListings, networkListings, sharedListings),
    [myListings, networkListings, sharedListings]
  );
  const [focus, setFocus] = useState<GlobePoint | null>(null);
  const phiRef = useRef(0);
  const pointer = useRef({ x: 0, dragging: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = canvas.offsetWidth || 480;
    const resize = () => {
      width = canvas.offsetWidth || 480;
      canvas.width = width * 2;
      canvas.height = width * 2;
      globe.update({ width: width * 2, height: width * 2 });
    };

    const markers = points.map((p) => ({
      location: [p.lat, p.lng] as [number, number],
      size: p.kind === "mine" ? 0.08 : 0.055,
    }));

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.25,
      dark: 0,
      diffuse: 1.15,
      mapSamples: 16000,
      mapBrightness: 4.5,
      baseColor: [0.96, 0.93, 0.88],
      markerColor: [0.71, 0.33, 0.04],
      glowColor: [0.95, 0.9, 0.82],
      markers,
    });

    let frame = 0;
    const tick = () => {
      if (!pointer.current.dragging) {
        phiRef.current += 0.0025;
      }
      globe.update({ phi: phiRef.current });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      globe.destroy();
    };
  }, [points]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
      <canvas
        ref={canvasRef}
        className="aspect-square w-full cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => {
          pointer.current.dragging = true;
          pointer.current.x = e.clientX;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!pointer.current.dragging) return;
          const dx = e.clientX - pointer.current.x;
          pointer.current.x = e.clientX;
          phiRef.current += dx / 200;
        }}
        onPointerUp={() => {
          pointer.current.dragging = false;
        }}
        aria-label="Interactive globe of places you can access"
      />

      <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-surface via-surface/95 to-transparent p-4 pt-10">
        <p className="text-xs text-muted">
          {points.length === 0
            ? "No mapped places yet — list a place or add friends."
            : `${points.length} place${points.length === 1 ? "" : "s"} you can access`}
        </p>
        {points.length > 0 && (
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {points.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setFocus(p);
                  router.push(`/listings/${p.id}`);
                }}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition touch-manipulation ${
                  focus?.id === p.id
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-background text-foreground hover:border-accent/50"
                }`}
                title={p.kind}
              >
                {p.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
