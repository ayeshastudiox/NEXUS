import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';

const originIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#22d3ee;border:2.5px solid #0a0e18;border-radius:50%;box-shadow:0 0 10px rgba(34,211,238,0.5)"></div>',
  iconSize: [18, 18], iconAnchor: [9, 9],
});
const destIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#f87171;border:2.5px solid #0a0e18;border-radius:50%;box-shadow:0 0 10px rgba(248,113,113,0.5)"></div>',
  iconSize: [18, 18], iconAnchor: [9, 9],
});

function makeVehicleIcon(emoji: string) {
  return L.divIcon({
    className: '',
    html: `<div style="font-size:24px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7));line-height:1">${emoji}</div>`,
    iconSize: [30, 30], iconAnchor: [15, 15],
  });
}

const MODE_ICONS: Record<string, string> = {
  OCEAN: '\u{1F6A2}',
  AIR: '\u2708\uFE0F',
  ROAD: '\u{1F69A}',
  RAIL: '\u{1F682}',
};

function getVehicleIcon(mode: string) {
  return makeVehicleIcon(MODE_ICONS[mode] || MODE_ICONS.OCEAN);
}

function interpolate(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
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

function FitRoute({ waypoints }: { waypoints: number[][] }) {
  const map = useMap();
  useMemo(() => {
    if (waypoints.length > 1) {
      const bounds = L.latLngBounds(waypoints.map(wp => [wp[0], wp[1]] as [number, number]));
      setTimeout(() => map.fitBounds(bounds, { padding: [50, 50] }), 100);
    }
  }, [waypoints, map]);
  return null;
}

function PulseMarker({ position }: { position: [number, number] }) {
  const map = useMap();
  useMemo(() => {
    const pulse = L.divIcon({
      className: '',
      html: `<div style="width:24px;height:24px;border-radius:50%;border:2px solid #38bdf8;animation:nx-pulse-ring 2s ease-out infinite;position:absolute;top:-12px;left:-12px;pointer-events:none"></div>`,
      iconSize: [24, 24], iconAnchor: [12, 12],
    });
    const marker = L.marker(position, { icon: pulse, interactive: false }).addTo(map);
    return () => { map.removeLayer(marker); };
  }, [map, position[0], position[1]]);
  return null;
}

interface ShipmentRouteMapProps {
  shipment: any;
  disruptions?: any[];
  height?: string;
}

export default function ShipmentRouteMap({ shipment, disruptions = [], height = '100%' }: ShipmentRouteMapProps) {
  const origin: [number, number] = [shipment.origin_lat || 0, shipment.origin_lng || 0];
  const dest: [number, number] = [shipment.destination_lat || 0, shipment.destination_lng || 0];

  const waypoints: number[][] = useMemo(() => {
    if (shipment.route_waypoints && shipment.route_waypoints.length >= 2) {
      return shipment.route_waypoints;
    }
    const segs = 8;
    const pts: number[][] = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      pts.push([interpolate(origin[0], dest[0], t), interpolate(origin[1], dest[1], t)]);
    }
    return pts;
  }, [shipment.route_waypoints, origin[0], origin[1], dest[0], dest[1]]);

  const progressFraction = Math.max(0, Math.min(1, (shipment.progress_percent || 0) / 100));

  const currentPosition: [number, number] = useMemo(() => {
    if (shipment.latest_tracking?.lat && shipment.latest_tracking?.lng) {
      return [shipment.latest_tracking.lat, shipment.latest_tracking.lng];
    }
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
    <div style={{ height, width: '100%', background: '#080c14', position: 'relative', overflow: 'hidden' }}>
      <style>{`@keyframes nx-pulse-ring{0%{transform:scale(0.8);opacity:1}100%{transform:scale(2);opacity:0}}`}</style>
      <MapContainer
        center={center}
        zoom={3}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        attributionControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitRoute waypoints={waypoints} />

        {completedWaypoints.length > 1 && (
          <Polyline
            positions={completedWaypoints.map((wp: number[]) => [wp[0], wp[1]] as [number, number])}
            pathOptions={{ color: '#38bdf8', weight: 3, opacity: 0.85 }}
          />
        )}
        {remainingWaypoints.length > 1 && (
          <Polyline
            positions={remainingWaypoints.map((wp: number[]) => [wp[0], wp[1]] as [number, number])}
            pathOptions={{ color: '#475569', weight: 2, opacity: 0.45, dashArray: '8 6' }}
          />
        )}

        <Marker position={origin} icon={originIcon}>
          <Popup>
            <div style={{ fontFamily: 'Public Sans, sans-serif' }}>
              <div style={{ fontWeight: 700, color: '#22d3ee', fontSize: 12 }}>ORIGIN</div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{shipment.origin_name}</div>
            </div>
          </Popup>
        </Marker>
        <Marker position={dest} icon={destIcon}>
          <Popup>
            <div style={{ fontFamily: 'Public Sans, sans-serif' }}>
              <div style={{ fontWeight: 700, color: '#f87171', fontSize: 12 }}>DESTINATION</div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{shipment.destination_name}</div>
            </div>
          </Popup>
        </Marker>

        {progressFraction > 0 && progressFraction < 1 && (
          <>
            <PulseMarker position={currentPosition} />
            <Marker position={currentPosition} icon={getVehicleIcon(shipment.transport_mode)}>
              <Popup>
                <div style={{ fontFamily: 'Public Sans, sans-serif' }}>
                  <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: 13 }}>{shipment.shipment_ref}</div>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                    {shipment.latest_tracking?.location_name || 'In Transit'}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
                    Progress: {Math.round(progressFraction * 100)}%
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {disruptions.map((d: any, i: number) => (
          <Circle
            key={i}
            center={[d.lat, d.lng]}
            radius={80000}
            pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.06, weight: 1, dashArray: '4 4' }}
          >
            <Popup>
              <div style={{ fontFamily: 'Public Sans, sans-serif' }}>
                <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: 12 }}>{d.location_name}</div>
                <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{d.category}: {d.severity}</div>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>

      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, padding: '4px 10px', borderRadius: 6, background: 'rgba(10,14,24,0.85)', backdropFilter: 'blur(4px)', border: '1px solid rgba(56,189,248,0.15)' }}>
        <span style={{ fontSize: 9, color: 'rgba(56,189,248,0.6)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>SIMULATED TRACKING</span>
      </div>

      <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 1000, padding: '6px 12px', borderRadius: 8, background: 'rgba(10,14,24,0.85)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 6px #22d3ee' }} />
            <span style={{ color: '#94a3b8' }}>Origin</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 20, height: 2, background: '#38bdf8', borderRadius: 1 }} />
            <span style={{ color: '#94a3b8' }}>Completed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 20, height: 2, background: '#475569', borderRadius: 1, borderTop: '1px dashed #475569' }} />
            <span style={{ color: '#94a3b8' }}>Remaining</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', boxShadow: '0 0 6px #f87171' }} />
            <span style={{ color: '#94a3b8' }}>Destination</span>
          </div>
        </div>
      </div>
    </div>
  );
}
