import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';

const originIcon = L.divIcon({
  className: '',
  html: '<div style="width:13px;height:13px;background:#2dd4bf;border:2.5px solid #05070a;border-radius:50%;box-shadow:0 0 10px rgba(45,212,191,0.55)"></div>',
  iconSize: [18, 18], iconAnchor: [9, 9],
});

const destIcon = L.divIcon({
  className: '',
  html: '<div style="width:13px;height:13px;background:#f43f5e;border:2.5px solid #05070a;border-radius:50%;box-shadow:0 0 10px rgba(244,63,94,0.5)"></div>',
  iconSize: [18, 18], iconAnchor: [9, 9],
});

function makeVehicleIcon(emoji: string) {
  return L.divIcon({
    className: '',
    html: `<div style="font-size:22px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.75));line-height:1">${emoji}</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  });
}

const MODE_ICONS: Record<string, string> = {
  OCEAN: '\u{1F6A2}',
  AIR: '\u2708\uFE0F',
  ROAD: '\u{1F69A}',
  RAIL: '\u{1F682}',
};

function getVehicleIcon(mode: string) {
  return makeVehicleIcon(MODE_ICONS[(mode || '').toUpperCase()] || MODE_ICONS.OCEAN);
}

function interpolate(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function interpolateAlongRoute(waypoints: number[][], fraction: number): [number, number] {
  if (waypoints.length < 2) return [waypoints[0]?.[0] || 0, waypoints[0]?.[1] || 0];
  let totalDist = 0;
  const segDists: number[] = [];
  for (let i = 1; i < waypoints.length; i++) {
    const d = haversineKm(waypoints[i - 1][0], waypoints[i - 1][1], waypoints[i][0], waypoints[i][1]);
    segDists.push(d);
    totalDist += d;
  }
  const targetDist = Math.min(fraction, 1) * totalDist;
  let traveled = 0;
  for (let i = 0; i < segDists.length; i++) {
    if (traveled + segDists[i] >= targetDist) {
      const t = segDists[i] > 0 ? (targetDist - traveled) / segDists[i] : 0;
      return [
        interpolate(waypoints[i][0], waypoints[i + 1][0], t),
        interpolate(waypoints[i][1], waypoints[i + 1][1], t),
      ];
    }
    traveled += segDists[i];
  }
  return [waypoints[waypoints.length - 1][0], waypoints[waypoints.length - 1][1]];
}

/**
 * Fits the map to the route. Runs as an effect (not useMemo) so the pending
 * fit is cancelled when the map unmounts or waypoints change.
 */
function FitRoute({ waypoints }: { waypoints: number[][] }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints.length < 2) return;
    const bounds = L.latLngBounds(waypoints.map(wp => [wp[0], wp[1]] as [number, number]));
    const t = window.setTimeout(() => {
      // Guard against a map that has already been torn down.
      if (!map.getContainer()) return;
      map.fitBounds(bounds, { padding: [50, 50] });
    }, 100);
    return () => window.clearTimeout(t);
  }, [waypoints, map]);
  return null;
}

/** Pulsing ring at the live position. Managed as an effect so the layer is removed. */
function PulseMarker({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const pulse = L.divIcon({
      className: '',
      html: '<div style="width:22px;height:22px;border-radius:50%;border:2px solid #2dd4bf;animation:nx-pulse-ring 2s ease-out infinite;position:absolute;top:-11px;left:-11px;pointer-events:none"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    const marker = L.marker(position, { icon: pulse, interactive: false }).addTo(map);
    return () => { marker.remove(); };
  }, [map, position]);
  return null;
}

interface ShipmentRouteMapProps {
  shipment: any;
  disruptions?: any[];
  height?: string;
}

export default function ShipmentRouteMap({ shipment, disruptions = [], height = '100%' }: ShipmentRouteMapProps) {
  const origin = useMemo<[number, number]>(
    () => [shipment.origin_lat || 0, shipment.origin_lng || 0],
    [shipment.origin_lat, shipment.origin_lng]
  );
  const dest = useMemo<[number, number]>(
    () => [shipment.destination_lat || 0, shipment.destination_lng || 0],
    [shipment.destination_lat, shipment.destination_lng]
  );

  const waypoints: number[][] = useMemo(() => {
    const raw = shipment.route_waypoints;
    if (Array.isArray(raw) && raw.length >= 2) return raw;
    const segs = 8;
    const pts: number[][] = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      pts.push([interpolate(origin[0], dest[0], t), interpolate(origin[1], dest[1], t)]);
    }
    return pts;
  }, [shipment.route_waypoints, origin, dest]);

  const progressFraction = Math.max(0, Math.min(1, (shipment.progress_percent || 0) / 100));

  const currentPosition = useMemo<[number, number]>(() => {
    const lt = shipment.latest_tracking;
    if (lt && Number.isFinite(lt.lat) && Number.isFinite(lt.lng)) return [lt.lat, lt.lng];
    return interpolateAlongRoute(waypoints, progressFraction);
  }, [shipment.latest_tracking, waypoints, progressFraction]);

  const center = useMemo<[number, number]>(() => {
    if (waypoints.length > 0) {
      const mid = Math.floor(waypoints.length / 2);
      return [waypoints[mid][0], waypoints[mid][1]];
    }
    return [(origin[0] + dest[0]) / 2, (origin[1] + dest[1]) / 2];
  }, [waypoints, origin, dest]);

  const completedIdx = Math.max(1, Math.floor(progressFraction * (waypoints.length - 1)));
  const completedWaypoints = waypoints.slice(0, completedIdx + 1);
  const remainingWaypoints = waypoints.slice(completedIdx);

  return (
    <div style={{ height, width: '100%', position: 'relative', overflow: 'hidden' }}>
      <style>{`@keyframes nx-pulse-ring{0%{transform:scale(0.8);opacity:1}100%{transform:scale(2);opacity:0}}`}</style>

      <MapContainer
        center={center}
        zoom={3}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitRoute waypoints={waypoints} />

        {completedWaypoints.length > 1 && (
          <Polyline
            positions={completedWaypoints.map((wp: number[]) => [wp[0], wp[1]] as [number, number])}
            pathOptions={{ color: '#2dd4bf', weight: 3, opacity: 0.9 }}
          />
        )}
        {remainingWaypoints.length > 1 && (
          <Polyline
            positions={remainingWaypoints.map((wp: number[]) => [wp[0], wp[1]] as [number, number])}
            pathOptions={{ color: '#475569', weight: 2, opacity: 0.5, dashArray: '7 6' }}
          />
        )}

        <Marker position={origin} icon={originIcon}>
          <Popup>
            <div>
              <div className="nx-popup-title">ORIGIN</div>
              <div className="nx-popup-route">{shipment.origin_name}</div>
            </div>
          </Popup>
        </Marker>

        <Marker position={dest} icon={destIcon}>
          <Popup>
            <div>
              <div className="nx-popup-title" style={{ color: '#f43f5e' }}>DESTINATION</div>
              <div className="nx-popup-route">{shipment.destination_name}</div>
            </div>
          </Popup>
        </Marker>

        {progressFraction > 0 && progressFraction < 1 && (
          <>
            <PulseMarker position={currentPosition} />
            <Marker position={currentPosition} icon={getVehicleIcon(shipment.transport_mode)}>
              <Popup>
                <div>
                  <div className="nx-popup-title">{shipment.shipment_ref}</div>
                  <div className="nx-popup-route">
                    {shipment.latest_tracking?.location_name || 'In transit'}
                  </div>
                  <div className="nx-popup-meta">
                    Progress {Math.round(progressFraction * 100)}%
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {disruptions.map((d: any, i: number) => (
          <Circle
            key={d.id ?? i}
            center={[d.lat, d.lng]}
            radius={80000}
            pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.06, weight: 1, dashArray: '4 4' }}
          >
            <Popup>
              <div>
                <div className="nx-popup-title" style={{ color: '#fbbf24' }}>{d.location_name}</div>
                <div className="nx-popup-route">
                  {String(d.category || '').replace(/_/g, ' ')} · {d.severity}
                </div>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>

      {/* Overlay chrome */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1000,
        padding: '4px 9px', borderRadius: 'var(--nx-r-sm)',
        background: 'rgba(7,9,13,0.85)', backdropFilter: 'blur(6px)',
        border: '1px solid var(--nx-border)',
      }}>
        <span className="nx-label" style={{ color: 'var(--nx-teal)' }}>Simulated tracking</span>
      </div>

      <div className="nx-map-legend" style={{ bottom: 10, left: 10 }}>
        <span className="nx-legend-item"><span className="nx-legend-dot" style={{ background: '#2dd4bf' }} />Origin</span>
        <span className="nx-legend-item"><span className="nx-legend-line" style={{ background: '#2dd4bf' }} />Completed</span>
        <span className="nx-legend-item"><span className="nx-legend-line" style={{ background: '#475569' }} />Remaining</span>
        <span className="nx-legend-item"><span className="nx-legend-dot" style={{ background: '#f43f5e' }} />Destination</span>
      </div>
    </div>
  );
}
