/**
 * NEXUS ATLAS — shared geospatial intelligence map
 * ----------------------------------------------------------------------------
 * ONE map system for the whole application. Presentation is driven by `mode`:
 *
 *   global   — fleet-wide situational awareness (Dashboard, Command Center)
 *   network  — hubs, lanes and congestion (Network Intelligence)
 *   journey  — a single shipment's route (Shipment Detail)
 *
 * Leaflet-based, using the existing leaflet + react-leaflet dependencies.
 *
 * Basemap: OpenStreetMap standard tiles — free, keyless, and explicitly
 * permitted for this use, with the required attribution rendered by Leaflet's
 * own attribution control. The tiles are re-toned in CSS to the NEXUS dark
 * palette; they are not hidden, cropped, or covered.
 *
 * Data integrity rules enforced here:
 *  - Coordinates come only from the backend. Nothing is synthesised.
 *  - A route built from real `route_waypoints` is drawn as a verified path.
 *  - A route with no waypoints is drawn DASHED and labelled "Direct
 *    connection", so an illustrative link is never mistaken for a tracked lane.
 *  - Positions come only from `latest_tracking`; absent tracking means no marker.
 *  - Route tone follows RISK only. Operational status is conveyed by dash, not
 *    by colour, so the map does not read as a colourful network diagram.
 */
import { MapContainer, TileLayer, Polyline, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Badge, Glyph, KeyValue, ModeBadge, RiskPill, humanize, statusTone,
} from '../ui';
import { IconArrowRight, IconClose } from '../Icons';

/* ------------------------------------------------------------------ *
 * Domain types — shaped against the existing API responses.
 * ------------------------------------------------------------------ */

export interface MapShipment {
  id?: number;
  shipment_ref: string;
  status?: string;
  transport_mode?: string;
  carrier?: string;
  company_name?: string | null;
  origin_name?: string;
  origin_lat?: number;
  origin_lng?: number;
  destination_name?: string;
  destination_lat?: number;
  destination_lng?: number;
  route_waypoints?: number[][];
  risk_level?: string;
  risk_score?: number | null;
  delay_hours?: number | null;
  progress_percent?: number;
  latest_tracking?: { lat: number; lng: number; location_name?: string } | null;
  has_active_disruption?: boolean;
  has_discrepancy?: boolean;
}

export interface MapHub {
  id?: number;
  name: string;
  lat: number;
  lng: number;
  location_type?: string;
  active_shipments?: number;
  active_disruptions?: any[];
}

export interface MapDisruption {
  id?: number;
  location_name: string;
  lat: number;
  lng: number;
  category?: string;
  severity?: string;
  description?: string;
  potential_impact_hours_min?: number;
  potential_impact_hours_max?: number;
  affected_shipment_count?: number;
}

export type AtlasMode = 'global' | 'network' | 'journey';

/* ------------------------------------------------------------------ *
 * Geometry
 * ------------------------------------------------------------------ */

type LatLng = [number, number];

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Normalise backend waypoints ([lat, lng] pairs) into Leaflet positions. */
function waypointsOf(s: MapShipment): LatLng[] {
  const raw = s.route_waypoints;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(w => Array.isArray(w) && w.length >= 2 && isNum(w[0]) && isNum(w[1]))
    .map(w => [w[0], w[1]] as LatLng);
}

/**
 * Illustrative arc for a shipment with no stored waypoints. The caller flags
 * this as a "Direct connection" rather than a tracked route.
 */
function arcBetween(a: LatLng, b: LatLng, samples = 28): LatLng[] {
  const [y1, x1] = a;
  const [y2, x2] = b;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const bow = Math.min(dist * 0.16, 14);
  const cx = mx + (-dy / dist) * bow;
  const cy = my + (dx / dist) * bow;
  const out: LatLng[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const it = 1 - t;
    out.push([
      it * it * y1 + 2 * it * t * cy + t * t * y2,
      it * it * x1 + 2 * it * t * cx + t * t * x2,
    ]);
  }
  return out;
}

interface RouteGeometry {
  shipment: MapShipment;
  path: LatLng[];
  verified: boolean;
  position: LatLng | null;
  heading: number | null;
  mid: LatLng | null;
}

function buildGeometry(shipments: MapShipment[]): RouteGeometry[] {
  return shipments.map(s => {
    const stored = waypointsOf(s);
    let path = stored;
    const verified = stored.length >= 2;

    if (!verified) {
      const o: LatLng | null = isNum(s.origin_lat) && isNum(s.origin_lng) ? [s.origin_lat, s.origin_lng] : null;
      const d: LatLng | null =
        isNum(s.destination_lat) && isNum(s.destination_lng) ? [s.destination_lat, s.destination_lng] : null;
      path = o && d ? arcBetween(o, d) : [];
    }

    const lt = s.latest_tracking;
    const position: LatLng | null = lt && isNum(lt.lat) && isNum(lt.lng) ? [lt.lat, lt.lng] : null;

    let heading: number | null = null;
    if (path.length >= 2) {
      const a = path[path.length - 2];
      const b = path[path.length - 1];
      const dLng = ((b[1] - a[1]) * Math.PI) / 180;
      const la1 = (a[0] * Math.PI) / 180;
      const la2 = (b[0] * Math.PI) / 180;
      const y = Math.sin(dLng) * Math.cos(la2);
      const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
      heading = (Math.atan2(y, x) * 180) / Math.PI;
    }

    const mid: LatLng | null = path.length >= 2 ? path[Math.floor(path.length / 2)] : null;

    return { shipment: s, path, verified, position, heading, mid };
  }).filter(g => g.path.length >= 2 || g.position);
}

/* ------------------------------------------------------------------ *
 * Route tone — RISK ONLY. Status is conveyed by dash pattern instead,
 * so normal traffic stays turquoise and the map reads calmly.
 * ------------------------------------------------------------------ */

interface RouteTone { core: string; glow: string; }

function toneFor(s: MapShipment): RouteTone {
  const level = (s.risk_level || '').toUpperCase();
  if (level === 'CRITICAL') return { core: '#ff3b4e', glow: 'rgba(255,59,78,0.16)' };
  if (level === 'HIGH') return { core: '#ff7043', glow: 'rgba(255,112,67,0.14)' };
  if (level === 'MEDIUM') return { core: '#f5a623', glow: 'rgba(245,166,35,0.12)' };
  return { core: '#31e6d0', glow: 'rgba(49,230,208,0.10)' };
}

/* ------------------------------------------------------------------ *
 * Marker icons — deliberately small so the geography stays readable.
 * ------------------------------------------------------------------ */

function nodeIcon(color: string, opts?: { size?: number; hollow?: boolean; label?: string }) {
  const size = opts?.size ?? 8;
  const halo = size * (opts?.hollow ? 2.8 : 3.4);
  const label = opts?.label
    ? `<span style="position:absolute;left:${size + 7}px;top:50%;transform:translateY(-50%);white-space:nowrap;font:600 10px/1 'IBM Plex Mono',monospace;letter-spacing:.06em;color:#eaf5f5;text-shadow:0 1px 4px #02070b,0 0 10px #02070b">${opts.label}</span>`
    : '';
  return L.divIcon({
    className: 'atl-node',
    html:
      `<div style="position:relative;width:${size}px;height:${size}px">` +
      /* Halo and ring are stronger than the previous pass so markers lift off
         the re-toned basemap instead of blending into it. */
      `<div style="position:absolute;left:50%;top:50%;width:${halo}px;height:${halo}px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,${color}52 0%,${color}00 70%)"></div>` +
      `<div style="position:absolute;inset:0;border-radius:50%;background:${opts?.hollow ? 'transparent' : color};border:1.6px solid ${color};box-shadow:0 0 0 1px rgba(2,7,11,0.85), 0 0 9px ${color}aa"></div>` +
      (opts?.hollow ? '' : `<div style="position:absolute;left:50%;top:50%;width:${size * 2.2}px;height:${size * 2.2}px;transform:translate(-50%,-50%);border-radius:50%;border:1px solid ${color}59"></div>`) +
      label +
      `</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function chevronIcon(color: string, heading: number) {
  return L.divIcon({
    className: 'atl-chevron',
    html:
      `<div style="width:13px;height:13px;transform:rotate(${heading}deg)">` +
      `<svg width="13" height="13" viewBox="0 0 14 14" fill="none">` +
      `<path d="M3 7h7M7.5 4.2 10.3 7l-2.8 2.8" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg></div>`,
    iconSize: [13, 13],
    iconAnchor: [6.5, 6.5],
  });
}

/* ------------------------------------------------------------------ *
 * Imperative map controls (buttons render outside MapContainer)
 * ------------------------------------------------------------------ */

interface MapActions { zoomIn: () => void; zoomOut: () => void; reset: () => void; }
const mapActions: { current: MapActions | null } = { current: null };

function MapActionBridge({ homeCenter, homeZoom }: { homeCenter: LatLng; homeZoom: number }) {
  const map = useMap();
  useEffect(() => {
    mapActions.current = {
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      reset: () => map.flyTo(homeCenter, homeZoom, { duration: 0.6 }),
    };
    return () => { mapActions.current = null; };
  }, [map, homeCenter, homeZoom]);
  return null;
}

/** Frames the selection, or fits the fleet on first paint. */
function ViewController({
  focus, focusKey, allPaths, homeZoom, autoFit,
}: {
  focus: LatLng[] | null;
  focusKey: string | null;
  allPaths: LatLng[][];
  homeZoom: number;
  /** Fit the whole fleet once on mount. Journey mode supplies its own framing. */
  autoFit: boolean;
}) {
  const map = useMap();
  const firstRun = useRef(true);

  useEffect(() => {
    if (focus && focus.length >= 2) {
      map.flyToBounds(L.latLngBounds(focus.map(p => L.latLng(p[0], p[1]))), {
        padding: [72, 72], duration: 0.7, maxZoom: 6,
      });
      return;
    }
    if (focus && focus.length === 1) {
      map.flyTo(focus[0], Math.max(map.getZoom(), 5), { duration: 0.7 });
      return;
    }
    if (firstRun.current) {
      firstRun.current = false;
      if (!autoFit) return;
      const pts = allPaths.flat();
      if (pts.length >= 2) {
        map.fitBounds(L.latLngBounds(pts.map(p => L.latLng(p[0], p[1]))), {
          padding: [56, 56], maxZoom: homeZoom,
        });
      }
    }
  }, [focus, focusKey, allPaths, map, homeZoom, autoFit]);

  return null;
}

function EscapeToClear({ onClear }: { onClear: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClear(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClear]);
  return null;
}

/** Vector graticule — independent of any tile provider. */
function LatLngGrid({ reduced }: { reduced: boolean }) {
  const lines = useMemo(() => {
    const out: { positions: LatLng[]; major: boolean }[] = [];
    for (let lat = -60; lat <= 60; lat += 15) {
      const positions: LatLng[] = [];
      for (let lng = -180; lng <= 180; lng += 6) positions.push([lat, lng]);
      out.push({ positions, major: lat === 0 });
    }
    for (let lng = -180; lng <= 180; lng += 15) {
      const positions: LatLng[] = [];
      for (let lat = -80; lat <= 80; lat += 6) positions.push([lat, lng]);
      out.push({ positions, major: lng === 0 });
    }
    return out;
  }, []);

  return (
    <>
      {lines.map((l, i) => (
        <Polyline
          key={`grid-${i}`}
          positions={l.positions}
          interactive={false}
          pathOptions={{
            color: '#31e6d0',
            weight: l.major ? 0.7 : 0.4,
            opacity: l.major ? 0.11 : 0.05,
            dashArray: reduced ? undefined : '1 6',
          }}
        />
      ))}
    </>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ *
 * Props
 * ------------------------------------------------------------------ */

export interface AtlasMapProps {
  shipments: MapShipment[];
  hubs?: MapHub[];
  disruptions?: MapDisruption[];
  height?: number | string;
  className?: string;
  /** Presentation variant. All three share this one implementation. */
  mode?: AtlasMode;
  /** Legend + stat readout. */
  chrome?: boolean;
  /** Shipment to select and frame on load (journey mode). */
  focusRef?: string | null;
  /** Start framed on the focusRef route instead of the whole fleet. */
  autoFocus?: boolean;
  /** Show hub markers. */
  showHubs?: boolean;
  /** Show disruption zones and markers. */
  showDisruptions?: boolean;
  /** Optional slot rendered above the legend. */
  footer?: ReactNode;
  onOpenDossier?: (ref: string) => void;
}

/**
 * OpenStreetMap standard tiles: free to use, no API key, and covered by the
 * ODbL with attribution. Leaflet's attribution control renders the required
 * credit; tiles are re-toned in CSS rather than hidden.
 */
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TILE_TIMEOUT_MS = 7000;

export default function AtlasMap({
  shipments,
  hubs = [],
  disruptions = [],
  height = 460,
  className = '',
  mode = 'global',
  chrome = true,
  focusRef = null,
  showHubs = true,
  showDisruptions = true,
  footer,
  onOpenDossier,
}: AtlasMapProps) {
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [selectedHub, setSelectedHub] = useState<MapHub | null>(null);
  const [hoverRef, setHoverRef] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<'pending' | 'ready' | 'unavailable'>('pending');
  const [showRoutes, setShowRoutes] = useState(true);
  const [showZones, setShowZones] = useState(showDisruptions);
  const reduced = usePrefersReducedMotion();

  // Journey mode: adopt the requested shipment as the selection.
  useEffect(() => {
    if (focusRef) setSelectedRef(focusRef);
  }, [focusRef]);

  useEffect(() => {
    if (basemap !== 'pending') return;
    const t = window.setTimeout(() => {
      setBasemap(prev => (prev === 'pending' ? 'unavailable' : prev));
    }, TILE_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [basemap]);

  const basemapReady = useCallback(() => setBasemap('ready'), []);
  const basemapFailed = useCallback(() => setBasemap('unavailable'), []);

  const geometry = useMemo(() => buildGeometry(shipments), [shipments]);
  const allPaths = useMemo(() => geometry.map(g => g.path), [geometry]);

  const selected = useMemo(
    () => geometry.find(g => g.shipment.shipment_ref === selectedRef) || null,
    [geometry, selectedRef]
  );

  const focus = useMemo<LatLng[] | null>(() => {
    if (selected) {
      if (selected.path.length >= 2) return selected.path;
      return selected.position ? [selected.position] : null;
    }
    if (selectedHub) return [[selectedHub.lat, selectedHub.lng]];
    return null;
  }, [selected, selectedHub]);

  const clearSelection = useCallback(() => {
    setSelectedRef(null);
    setSelectedHub(null);
  }, []);

  const selectShipment = useCallback((ref: string) => {
    setSelectedHub(null);
    setSelectedRef(prev => (prev === ref ? null : ref));
  }, []);

  const hubNodes = useMemo(() => hubs.filter(h => isNum(h.lat) && isNum(h.lng)), [hubs]);
  const disruptionNodes = useMemo(() => disruptions.filter(d => isNum(d.lat) && isNum(d.lng)), [disruptions]);

  const stats = useMemo(() => {
    const high = shipments.filter(s => ['HIGH', 'CRITICAL'].includes((s.risk_level || '').toUpperCase())).length;
    const delayed = shipments.filter(s => s.status === 'DELAYED').length;
    return {
      shipments: shipments.length,
      high,
      delayed,
      hubs: hubNodes.length,
      disruptions: disruptionNodes.length,
      verified: geometry.filter(g => g.verified).length,
    };
  }, [shipments, hubNodes, disruptionNodes, geometry]);

  // Journey mode frames tightly; global/network frame the hemisphere.
  const homeZoom = mode === 'journey' ? 5 : 2;
  const homeCenter: LatLng = [22, 18];

  const isJourney = mode === 'journey';

  return (
    <div
      className={
        `atl-map atl-map--${mode}` +
        (basemap === 'unavailable' ? ' atl-map--offline' : '') +
        (className ? ` ${className}` : '')
      }
      style={{ height }}
    >
      <MapContainer
        center={homeCenter}
        zoom={mode === 'journey' ? 4 : 3}
        minZoom={2}
        maxZoom={12}
        zoomControl={false}
        attributionControl
        worldCopyJump
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          maxZoom={19}
          eventHandlers={{ tileload: basemapReady, load: basemapReady, tileerror: basemapFailed }}
        />

        <LatLngGrid reduced={reduced} />
        <MapActionBridge homeCenter={homeCenter} homeZoom={homeZoom} />
        <ViewController
          focus={focus}
          focusKey={selectedRef ?? selectedHub?.name ?? null}
          allPaths={allPaths}
          homeZoom={homeZoom}
          autoFit={!isJourney}
        />
        <EscapeToClear onClear={clearSelection} />

        {/* Disruption zones, beneath routes */}
        {showZones && disruptionNodes.map((d, i) => {
          const critical = ['HIGH', 'CRITICAL'].includes((d.severity || '').toUpperCase());
          const color = critical ? '#ff3b4e' : '#f5a623';
          return (
            <Circle
              key={`zone-${d.id ?? i}`}
              center={[d.lat, d.lng]}
              radius={critical ? 380000 : 260000}
              interactive={false}
              pathOptions={{
                color, weight: 1, opacity: 0.42,
                fillColor: color, fillOpacity: 0.045, dashArray: '3 5',
              }}
            />
          );
        })}

        {/* Routes — unselected recede, selected illuminates */}
        {showRoutes && geometry.map(g => {
          const tone = toneFor(g.shipment);
          const ref = g.shipment.shipment_ref;
          const isSelected = selectedRef === ref;
          const isHovered = hoverRef === ref;
          const anySelection = selectedRef !== null;
          // In journey mode the focused route dominates; everything else recedes hard.
          const base = isJourney ? (isSelected ? 1 : 0.16) : (anySelection ? 0.3 : 0.7);
          const opacity = isSelected ? 1 : isHovered ? Math.min(0.9, base + 0.25) : base;

          return (
            <Fragment key={`route-${ref}`}>
              {/* Dark casing keeps the lane readable where it crosses light map
                  features; a soft glow is added only for the selected route. */}
              <Polyline
                positions={g.path}
                interactive={false}
                pathOptions={{
                  color: isSelected ? tone.glow : 'rgba(2, 7, 11, 0.55)',
                  weight: isSelected ? 9 : 3.2,
                  opacity: isSelected ? 0.9 : 0.6,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Polyline
                positions={g.path}
                interactive={false}
                pathOptions={{
                  color: tone.core,
                  weight: isSelected ? 2.2 : 1.3,
                  opacity,
                  // Status, not risk: delayed lanes read as dashed.
                  dashArray: !g.verified ? '7 6' : g.shipment.status === 'DELAYED' ? '5 4' : undefined,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {isSelected && !reduced && (
                <Polyline
                  positions={g.path}
                  interactive={false}
                  pathOptions={{
                    color: '#79fff0',
                    weight: 2,
                    opacity: 0.75,
                    dashArray: '2 22',
                    lineCap: 'round',
                    className: 'atl-flow',
                  }}
                />
              )}
            </Fragment>
          );
        })}

        {/* Direction chevrons — selected route only, to reduce clutter */}
        {showRoutes && geometry.map(g =>
          g.mid && g.heading != null && selectedRef === g.shipment.shipment_ref ? (
            <Marker
              key={`chev-${g.shipment.shipment_ref}`}
              position={g.mid}
              icon={chevronIcon('#79fff0', g.heading)}
              interactive={false}
            />
          ) : null
        )}

        {/* Reported positions — only where tracking exists */}
        {geometry.map(g => {
          if (!g.position) return null;
          const ref = g.shipment.shipment_ref;
          const isSelected = selectedRef === ref;
          const anySelection = selectedRef !== null;
          const dim = anySelection && !isSelected;
          return (
            <Marker
              key={`pos-${ref}`}
              position={g.position}
              icon={nodeIcon(isSelected ? '#79fff0' : toneFor(g.shipment).core, {
                size: isSelected ? 11 : 8,
                label: isSelected ? ref : undefined,
              })}
              opacity={dim ? 0.28 : 1}
              eventHandlers={{
                click: () => selectShipment(ref),
                mouseover: () => setHoverRef(ref),
                mouseout: () => setHoverRef(null),
              }}
            />
          );
        })}

        {/* Hubs */}
        {showHubs && hubNodes.map(h => {
          const alerted = (h.active_disruptions?.length ?? 0) > 0;
          const isSelected = selectedHub?.name === h.name;
          const color = alerted ? '#ff7043' : isSelected ? '#79fff0' : '#3bc7e8';
          return (
            <Marker
              key={`hub-${h.id ?? h.name}`}
              position={[h.lat, h.lng]}
              icon={nodeIcon(color, { size: isSelected ? 9 : 6, hollow: true })}
              eventHandlers={{ click: () => { setSelectedRef(null); setSelectedHub(h); } }}
            />
          );
        })}

        {/* Disruption markers */}
        {showZones && disruptionNodes.map((d, i) => {
          const critical = ['HIGH', 'CRITICAL'].includes((d.severity || '').toUpperCase());
          return (
            <Marker
              key={`dismark-${d.id ?? i}`}
              position={[d.lat, d.lng]}
              icon={nodeIcon(critical ? '#ff3b4e' : '#f5a623', { size: 8, hollow: true })}
              interactive={false}
            />
          );
        })}
      </MapContainer>

      {/* ---------------- Floating chrome ---------------- */}

      {basemap === 'unavailable' && (
        <div className="atl-map-notice">
          <Glyph name="alert" size={11} />
          Basemap unavailable — vector routes only
        </div>
      )}

      {chrome && (
        <>
          <div className="atl-map-stats">
            <div className="atl-map-stat"><span>Shipments</span><b>{stats.shipments}</b></div>
            <div className="atl-map-stat">
              <span>High risk</span>
              <b style={{ color: stats.high > 0 ? 'var(--nx-high)' : undefined }}>{stats.high}</b>
            </div>
            <div className="atl-map-stat">
              <span>Delayed</span>
              <b style={{ color: stats.delayed > 0 ? 'var(--nx-warn)' : undefined }}>{stats.delayed}</b>
            </div>
            {!isJourney && <div className="atl-map-stat"><span>Hubs</span><b>{stats.hubs}</b></div>}
            {!isJourney && (
              <div className="atl-map-stat">
                <span>Disruptions</span>
                <b style={{ color: stats.disruptions > 0 ? 'var(--nx-critical)' : undefined }}>{stats.disruptions}</b>
              </div>
            )}
            <div className="atl-map-stat atl-map-stat--foot">
              <span>Tracked routes</span><b>{stats.verified}/{stats.shipments}</b>
            </div>
          </div>

          <div className="atl-map-legend">
            <span className="atl-legend-item"><i style={{ background: '#31e6d0' }} />Normal</span>
            <span className="atl-legend-item"><i style={{ background: '#f5a623' }} />Medium</span>
            <span className="atl-legend-item"><i style={{ background: '#ff7043' }} />High</span>
            <span className="atl-legend-item"><i style={{ background: '#ff3b4e' }} />Critical</span>
            <span className="atl-legend-item atl-legend-dashed"><i />Unverified path</span>
          </div>
        </>
      )}

      {footer && <div className="atl-map-footer">{footer}</div>}

      {/* Controls — every one has real behaviour */}
      <div className="atl-map-controls">
        <button type="button" className="atl-map-btn" aria-label="Zoom in" title="Zoom in"
          onClick={() => mapActions.current?.zoomIn()}>+</button>
        <button type="button" className="atl-map-btn" aria-label="Zoom out" title="Zoom out"
          onClick={() => mapActions.current?.zoomOut()}>−</button>
        <button type="button" className="atl-map-btn" aria-label="Reset view" title="Reset view"
          onClick={() => { clearSelection(); mapActions.current?.reset(); }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3.5 4.5V10h5.5" />
          </svg>
        </button>
        <button
          type="button"
          className={`atl-map-btn${showRoutes ? ' is-on' : ''}`}
          aria-label={showRoutes ? 'Hide routes' : 'Show routes'}
          aria-pressed={showRoutes}
          title={showRoutes ? 'Hide routes' : 'Show routes'}
          onClick={() => setShowRoutes(v => !v)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 3 9 4.7-9 4.7-9-4.7Z" /><path d="m3.5 12.4 8.5 4.4 8.5-4.4" /><path d="m3.5 16.6 8.5 4.4 8.5-4.4" />
          </svg>
        </button>
        {showDisruptions && (
          <button
            type="button"
            className={`atl-map-btn${showZones ? ' is-on' : ''}`}
            aria-label={showZones ? 'Hide disruptions' : 'Show disruptions'}
            aria-pressed={showZones}
            title={showZones ? 'Hide disruptions' : 'Show disruptions'}
            onClick={() => setShowZones(v => !v)}
          >
            <Glyph name="alert" size={15} />
          </button>
        )}
      </div>

      {/* ---------------- Selection panels ---------------- */}

      {selected && (
        <div className="atl-float atl-map-panel" role="dialog" aria-label={`${selected.shipment.shipment_ref} intelligence`}>
          <div className="atl-float-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span className="atl-ref">{selected.shipment.shipment_ref}</span>
              <Badge tone={statusTone(selected.shipment.status)}>{humanize(selected.shipment.status)}</Badge>
            </div>
            <button type="button" className="atl-float-close" onClick={clearSelection} aria-label="Close panel">
              <IconClose size={13} />
            </button>
          </div>
          <div className="atl-float-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <ModeBadge mode={selected.shipment.transport_mode} />
              <RiskPill level={selected.shipment.risk_level} score={selected.shipment.risk_score} />
              {!selected.verified && <Badge tone="neutral">Direct connection</Badge>}
            </div>

            <div className="nx-kv">
              <KeyValue
                label="Lane"
                value={`${selected.shipment.origin_name || '—'} → ${selected.shipment.destination_name || '—'}`}
              />
              <KeyValue label="Carrier" value={selected.shipment.carrier || '—'} />
              <KeyValue
                label="Reported position"
                value={selected.shipment.latest_tracking?.location_name || 'No tracking reported'}
              />
              <KeyValue
                label="Route geometry"
                value={selected.verified ? `${selected.path.length} waypoints` : 'Origin → destination'}
                mono
              />
            </div>

            {onOpenDossier && (
              <button
                type="button"
                className="nx-btn nx-btn-primary"
                style={{ width: '100%', marginTop: 12 }}
                onClick={() => onOpenDossier(selected.shipment.shipment_ref)}
              >
                View intelligence dossier <IconArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {selectedHub && (
        <div className="atl-float atl-map-panel" role="dialog" aria-label={`${selectedHub.name} hub`}>
          <div className="atl-float-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Glyph name="network" size={14} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--nx-text-1)' }}>{selectedHub.name}</span>
            </div>
            <button type="button" className="atl-float-close" onClick={clearSelection} aria-label="Close panel">
              <IconClose size={13} />
            </button>
          </div>
          <div className="atl-float-body">
            <div className="nx-kv">
              <KeyValue label="Type" value={humanize(selectedHub.location_type)} />
              <KeyValue
                label="Coordinates"
                value={`${selectedHub.lat.toFixed(3)}, ${selectedHub.lng.toFixed(3)}`}
                mono
              />
              <KeyValue label="Active shipments" value={selectedHub.active_shipments ?? 0} mono />
              <KeyValue label="Linked disruptions" value={selectedHub.active_disruptions?.length ?? 0} mono />
            </div>

            {(selectedHub.active_disruptions?.length ?? 0) > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {selectedHub.active_disruptions!.map((d: any, i: number) => (
                  <div key={d.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span className="nx-sev nx-sev-critical" />
                    <span className="nx-meta">{humanize(d.category)} · {d.severity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
