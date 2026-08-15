"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import createGlobe from "cobe";
import type { Listing } from "@philoxenia/shared";

type PointKind = "mine" | "friend" | "shared";

type GlobePoint = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  kind: PointKind;
  location: string;
};

const KIND_RGB: Record<PointKind, [number, number, number]> = {
  mine: [0.71, 0.33, 0.04],
  friend: [0.47, 0.44, 0.42],
  shared: [0.66, 0.64, 0.62],
};

const KIND_HEX: Record<PointKind, string> = {
  mine: "#b45309",
  friend: "#78716c",
  shared: "#a8a29e",
};

const MARKER_SIZE: Record<PointKind, number> = {
  mine: 0.011,
  friend: 0.009,
  shared: 0.008,
};

const SCALE_MIN = 0.9;
const SCALE_MAX = 2.9;
/** Screen distance under which pins merge into one clickable cluster. */
const CLUSTER_GAP = 16;

function toPoints(
  mine: Listing[],
  network: Listing[],
  shared: Listing[]
): GlobePoint[] {
  const byId = new Map<string, GlobePoint>();

  function add(list: Listing[], kind: PointKind) {
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
        location: l.location,
      });
    }
  }

  add(mine, "mine");
  add(network, "friend");
  add(shared, "shared");
  return [...byId.values()];
}

function latLngToXYZ(lat: number, lng: number): [number, number, number] {
  const φ = (lat * Math.PI) / 180;
  const λ = (lng * Math.PI) / 180 - Math.PI;
  const cosφ = Math.cos(φ);
  return [-cosφ * Math.cos(λ), Math.sin(φ), cosφ * Math.sin(λ)];
}

function projectPoint(
  lat: number,
  lng: number,
  phi: number,
  theta: number,
  scale: number,
  width: number,
  height: number,
  elevation = 0.04
): { x: number; y: number; visible: boolean } {
  const [x0, y0, z0] = latLngToXYZ(lat, lng);
  const r = 0.8 + elevation;
  const t0 = x0 * r;
  const t1 = y0 * r;
  const t2 = z0 * r;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);
  const c = cosP * t0 + sinP * t2;
  const s = sinP * sinT * t0 + cosT * t1 - cosP * sinT * t2;
  const z = -sinP * cosT * t0 + sinT * t1 + cosP * cosT * t2;
  const aspect = width / Math.max(height, 1);
  const x = ((c / aspect) * scale + 1) / 2;
  const y = (-s * scale + 1) / 2;
  const visible = z >= 0 || c * c + s * s >= 0.64;
  return { x: x * width, y: y * height, visible };
}

type ScreenPin = {
  key: string;
  x: number;
  y: number;
  visible: boolean;
  items: GlobePoint[];
};

/** Union-find style clustering by projected pixel distance. */
function clusterPins(
  points: GlobePoint[],
  projected: { x: number; y: number; visible: boolean }[],
  gap: number
): ScreenPin[] {
  const n = points.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number =>
    parent[i] === i ? i : (parent[i] = find(parent[i]));
  const unite = (a: number, b: number) => {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent[pa] = pb;
  };

  for (let i = 0; i < n; i++) {
    if (!projected[i].visible) continue;
    for (let j = i + 1; j < n; j++) {
      if (!projected[j].visible) continue;
      const d = Math.hypot(
        projected[i].x - projected[j].x,
        projected[i].y - projected[j].y
      );
      if (d < gap) unite(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (!projected[i].visible) continue;
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }

  const clusters: ScreenPin[] = [];
  for (const idxs of groups.values()) {
    let x = 0;
    let y = 0;
    const items: GlobePoint[] = [];
    for (const i of idxs) {
      x += projected[i].x;
      y += projected[i].y;
      items.push(points[i]);
    }
    x /= idxs.length;
    y /= idxs.length;
    // Prefer mine color priority in multi
    items.sort((a, b) => {
      const rank = (k: PointKind) =>
        k === "mine" ? 0 : k === "friend" ? 1 : 2;
      return rank(a.kind) - rank(b.kind);
    });
    clusters.push({
      key: items.map((it) => it.id).join("|"),
      x,
      y,
      visible: true,
      items,
    });
  }
  return clusters;
}

function focusAngles(points: GlobePoint[]): { phi: number; theta: number } {
  if (points.length === 0) return { phi: 0.4, theta: 0.2 };
  const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return {
    phi: (-avgLng * Math.PI) / 180,
    theta: (avgLat * Math.PI) / 180 / 2.2,
  };
}

function kindLabel(kind: PointKind) {
  return kind === "mine" ? "Yours" : kind === "friend" ? "Friend" : "Shared";
}

/**
 * Interactive globe: true lat/lng markers, clustered when they would overlap,
 * tap opens listing (or picker for a stack).
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const tipTitleRef = useRef<HTMLParagraphElement>(null);
  const tipMetaRef = useRef<HTMLParagraphElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const phiRef = useRef(0.35);
  const thetaRef = useRef(0.2);
  const scaleRef = useRef(1.25);
  const dragging = useRef(false);
  const lastPtr = useRef({ x: 0, y: 0 });
  const autoSpin = useRef(true);
  const sizeRef = useRef({ w: 640, h: 420 });
  const hoverKeyRef = useRef<string | null>(null);
  const pinEls = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pointsRef = useRef<GlobePoint[]>([]);
  const clustersRef = useRef<ScreenPin[]>([]);
  const focusedOnce = useRef(false);
  const menuOpenRef = useRef(false);

  const points = useMemo(
    () => toPoints(myListings, networkListings, sharedListings),
    [myListings, networkListings, sharedListings]
  );
  pointsRef.current = points;

  const [height, setHeight] = useState(420);
  const [clusterKeys, setClusterKeys] = useState<string[]>([]);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    items: GlobePoint[];
  } | null>(null);
  menuOpenRef.current = Boolean(menu);

  useEffect(() => {
    if (points.length === 0 || focusedOnce.current) return;
    const focus = focusAngles(points);
    phiRef.current = focus.phi;
    thetaRef.current = focus.theta;
    scaleRef.current =
      points.length <= 2 ? 1.65 : points.length <= 5 ? 1.4 : 1.25;
    focusedOnce.current = true;
  }, [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const measure = () => {
      const w = wrap.clientWidth || 640;
      const h = Math.round(Math.min(Math.max(w * 0.68, 300), 460));
      sizeRef.current = { w, h };
      setHeight(h);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    measure();

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: sizeRef.current.w,
      height: sizeRef.current.h,
      phi: phiRef.current,
      theta: thetaRef.current,
      scale: scaleRef.current,
      dark: 0,
      diffuse: 1.12,
      mapSamples: 14000,
      mapBrightness: 5.4,
      mapBaseBrightness: 0.07,
      baseColor: [0.95, 0.93, 0.9],
      markerColor: KIND_RGB.friend,
      glowColor: [0.93, 0.91, 0.87],
      markerElevation: 0.03,
      markers: [],
    });

    let raf = 0;
    let alive = true;
    let lastClusterSig = "";

    const tick = () => {
      if (!alive) return;
      if (autoSpin.current && !dragging.current && !menuOpenRef.current) {
        phiRef.current += 0.0016;
      }

      const pts = pointsRef.current;
      const markers = pts.map((p, i) => ({
        location: [p.lat, p.lng] as [number, number],
        size: MARKER_SIZE[p.kind],
        color: KIND_RGB[p.kind],
        id: `p${i}`,
      }));

      const { w, h } = sizeRef.current;
      globe.update({
        width: w,
        height: h,
        phi: phiRef.current,
        theta: thetaRef.current,
        scale: scaleRef.current,
        markers,
      });

      const projected = pts.map((p) =>
        projectPoint(
          p.lat,
          p.lng,
          phiRef.current,
          thetaRef.current,
          scaleRef.current,
          w,
          h
        )
      );
      const clusters = clusterPins(pts, projected, CLUSTER_GAP);
      clustersRef.current = clusters;

      const sig = clusters.map((c) => c.key).join(";");
      if (sig !== lastClusterSig) {
        lastClusterSig = sig;
        // Force React to sync cluster buttons when set changes
        setClusterKeys(clusters.map((c) => c.key));
      }

      let tipX = 0;
      let tipY = 0;
      let tipVisible = false;

      for (const cluster of clusters) {
        const el = pinEls.current.get(cluster.key);
        if (!el) continue;
        el.style.visibility = "visible";
        el.style.pointerEvents = "auto";
        el.style.left = `${cluster.x}px`;
        el.style.top = `${cluster.y}px`;
        if (hoverKeyRef.current === cluster.key) {
          tipX = cluster.x;
          tipY = cluster.y;
          tipVisible = true;
        }
      }

      // Hide stale buttons
      for (const [key, el] of pinEls.current) {
        if (!clusters.some((c) => c.key === key)) {
          el.style.visibility = "hidden";
          el.style.pointerEvents = "none";
        }
      }

      const tip = tipRef.current;
      if (tip) {
        if (tipVisible && !menuOpenRef.current) {
          tip.style.opacity = "1";
          tip.style.left = `${tipX}px`;
          tip.style.top = `${Math.max(10, tipY - 48)}px`;
        } else {
          tip.style.opacity = "0";
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      autoSpin.current = false;
      setMenu(null);
      const next = scaleRef.current * (e.deltaY > 0 ? 0.93 : 1.07);
      scaleRef.current = Math.min(SCALE_MAX, Math.max(SCALE_MIN, next));
    };
    wrap.addEventListener("wheel", onWheelNative, { passive: false });

    const ro = new ResizeObserver(measure);
    ro.observe(wrap);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      wrap.removeEventListener("wheel", onWheelNative);
      ro.disconnect();
      globe.destroy();
    };
  }, []);

  function isInteractiveTarget(target: EventTarget | null) {
    return (
      target instanceof Element &&
      Boolean(target.closest("[data-globe-pin], [data-globe-menu]"))
    );
  }

  function onPointerDown(e: React.PointerEvent) {
    if (isInteractiveTarget(e.target)) return;
    setMenu(null);
    dragging.current = true;
    autoSpin.current = false;
    lastPtr.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - lastPtr.current.x;
    const dy = e.clientY - lastPtr.current.y;
    lastPtr.current = { x: e.clientX, y: e.clientY };
    const sens = 0.0042 / Math.max(scaleRef.current, 0.85);
    phiRef.current += dx * sens;
    thetaRef.current = Math.max(
      -1.05,
      Math.min(1.05, thetaRef.current - dy * sens)
    );
  }

  function onPointerUp() {
    dragging.current = false;
  }

  function showTip(cluster: ScreenPin) {
    hoverKeyRef.current = cluster.key;
    const first = cluster.items[0];
    if (tipTitleRef.current) {
      tipTitleRef.current.textContent =
        cluster.items.length > 1
          ? `${cluster.items.length} listings here`
          : first.title;
    }
    if (tipMetaRef.current) {
      tipMetaRef.current.textContent =
        cluster.items.length > 1
          ? "Tap to choose · zoom in to split"
          : `${kindLabel(first.kind)} · ${first.location}`;
    }
  }

  function hideTip() {
    hoverKeyRef.current = null;
  }

  function onPinClick(cluster: ScreenPin) {
    if (cluster.items.length === 1) {
      setMenu(null);
      router.push(`/listings/${cluster.items[0].id}`);
      return;
    }
    setMenu({ x: cluster.x, y: cluster.y, items: cluster.items });
  }

  // Resolve cluster objects for current keys from live ref each render
  const liveClusters = clusterKeys
    .map((key) => clustersRef.current.find((c) => c.key === key))
    .filter((c): c is ScreenPin => Boolean(c));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#f2efe9]">
      <div
        ref={wrapRef}
        className="relative w-full select-none touch-none"
        style={{ height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label="Interactive globe of places you can access"
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        <div className="pointer-events-none absolute inset-0">
          {liveClusters.map((cluster) => {
            const lead = cluster.items[0];
            const multi = cluster.items.length > 1;
            return (
              <button
                key={cluster.key}
                type="button"
                data-globe-pin
                ref={(el) => {
                  if (el) pinEls.current.set(cluster.key, el);
                  else pinEls.current.delete(cluster.key);
                }}
                aria-label={
                  multi
                    ? `${cluster.items.length} listings`
                    : `Open ${lead.title}`
                }
                className="group pointer-events-auto absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-transparent focus-visible:outline-none"
                style={{ visibility: "hidden" }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerEnter={(e) => {
                  e.stopPropagation();
                  showTip(cluster);
                }}
                onPointerLeave={hideTip}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onPinClick(cluster);
                }}
              >
                <span
                  className={`relative block rounded-full border border-white/90 shadow-[0_1px_2px_rgba(0,0,0,0.22)] transition-transform duration-150 group-hover:scale-125 ${
                    multi ? "h-2.5 w-2.5" : "h-1.5 w-1.5"
                  }`}
                  style={{ background: KIND_HEX[lead.kind] }}
                  aria-hidden
                >
                  {multi ? (
                    <span className="absolute -right-2 -top-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-foreground px-0.5 text-[8px] font-medium leading-none text-surface">
                      {cluster.items.length}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <div
          ref={tipRef}
          className="pointer-events-none absolute z-20 w-[min(200px,72%)] -translate-x-1/2 rounded-lg border border-border/80 bg-surface/95 px-2.5 py-1.5 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-150"
        >
          <p
            ref={tipTitleRef}
            className="truncate text-[11px] font-medium leading-snug text-foreground"
          />
          <p
            ref={tipMetaRef}
            className="mt-0.5 truncate text-[9px] leading-tight text-muted"
          />
        </div>

        {menu ? (
          <div
            ref={menuRef}
            data-globe-menu
            data-open="true"
            className="absolute z-30 w-[min(220px,78%)] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
            style={{
              left: menu.x,
              top: Math.min(menu.y + 14, height - 120),
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="border-b border-border px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-muted">
              Choose listing
            </p>
            <ul className="max-h-40 overflow-auto py-1">
              {menu.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-background"
                    onClick={() => {
                      setMenu(null);
                      router.push(`/listings/${item.id}`);
                    }}
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: KIND_HEX[item.kind] }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="block truncate text-[10px] text-muted">
                        {kindLabel(item.kind)} · {item.location}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2.5 py-1.5">
        <p className="min-w-0 truncate text-[9px] tracking-wide text-muted">
          {points.length === 0
            ? "No mapped places yet"
            : `${points.length} · drag · scroll · tap pin`}
        </p>
        <div className="flex shrink-0 items-center gap-2.5">
          {(
            [
              ["mine", "Yours"],
              ["friend", "Friends"],
              ["shared", "Shared"],
            ] as const
          ).map(([kind, label]) => (
            <span
              key={kind}
              className="inline-flex items-center gap-1 text-[9px] text-muted"
            >
              <span
                className="inline-block h-1 w-1 rounded-full"
                style={{ background: KIND_HEX[kind] }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
