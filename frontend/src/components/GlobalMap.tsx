import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const shipIcon = L.divIcon({
  className: 'nx-marker',
  html: '<div style="width:8px;height:8px;background:#38bdf8;border:2px solid #0c1220;border-radius:50%;box-shadow:0 0 8px rgba(56,189,248,0.4)"></div>',
  iconSize: [12, 12], iconAnchor: [6, 6],
});
const aircraftIcon = L.divIcon({
  className: 'nx-marker',
  html: '<div style="width:8px;height:8px;background:#94a3b8;border:2px solid #0c1220;border-radius:50%;box-shadow:0 0 6px rgba(148,163,184,0.3)"></div>',
  iconSize: [12, 12], iconAnchor: [6, 6],
});
const truckIcon = L.divIcon({
  className: 'nx-marker',
  html: '<div style="width:6px;height:6px;background:#06b6d4;border:1.5px solid #0c1220;border-radius:50%"></div>',
  iconSize: [10, 10], iconAnchor: [5, 5],
});
const trainIcon = L.divIcon({
  className: 'nx-marker',
  html: '<div style="width:6px;height:6px;background:#f59e0b;border:1.5px solid #0c1220;border-radius:50%"></div>',
  iconSize: [10, 10], iconAnchor: [5, 5],
});

function getVehicleIcon(mode: string) {
  switch (mode) {
    case 'OCEAN': return shipIcon;
    case 'AIR': return aircraftIcon;
    case 'ROAD': return truckIcon;
    case 'RAIL': return trainIcon;
    default: return shipIcon;
  }
}

function FitBounds({ shipments }: { shipments: any[] }) {
  const map = useMap();
  const allPoints: [number, number][] = [];
  shipments.forEach(s => {
    if (s.route_waypoints) {
      s.route_waypoints.forEach((wp: number[]) => allPoints.push([wp[0], wp[1]]));
    }
    if (s.latest_tracking) {
      allPoints.push([s.latest_tracking.lat, s.latest_tracking.lng]);
    }
  });
  if (allPoints.length > 0) {
    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 5 });
  }
  return null;
}

function HubMarkers({ hubs }: { hubs?: any[] }) {
  if (!hubs || hubs.length === 0) return null;
  return (
    <>
      {hubs.map((hub: any) => {
        if (!hub.lat || !hub.lng) return null;
        const hasDisruption = hub.active_disruptions?.length > 0;
        return (
          <div key={hub.id || hub.name}>
            <CircleMarker
              center={[hub.lat, hub.lng]}
              radius={hasDisruption ? 5 : 3.5}
              pathOptions={{
                color: hasDisruption ? '#ef4444' : '#0ea5e9',
                fillColor: hasDisruption ? '#ef4444' : '#0ea5e9',
                fillOpacity: 0.8,
                weight: 1,
                opacity: 0.9,
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'Public Sans, sans-serif', padding: '2px 0' }}>
                  <div style={{ fontWeight: 700, color: hasDisruption ? '#ef4444' : '#0ea5e9', fontSize: '11px' }}>{hub.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '1px' }}>{hub.location_type?.replace(/_/g, ' ')}</div>
                  {(hub.active_shipment_count !== undefined || hub.active_shipments !== undefined) && (
                    <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>{hub.active_shipment_count ?? hub.active_shipments} active</div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
            {hasDisruption && (
              <CircleMarker
                center={[hub.lat, hub.lng]}
                radius={10}
                pathOptions={{ color: '#ef4444', fillColor: 'transparent', fillOpacity: 0, weight: 0.5, opacity: 0.25, dashArray: '2 2' }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

interface GlobalMapProps {
  shipments: any[];
  hubs?: any[];
  height?: string;
  compact?: boolean;
  className?: string;
}

export default function GlobalMap({ shipments, hubs, height = '100%', compact = false, className = '' }: GlobalMapProps) {
  return (
    <div className={`nx-map ${className}`} style={{ height, background: '#060a12', position: 'relative', overflow: 'hidden' }}>
      <MapContainer
        center={[25, 45]}
        zoom={3}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
        dragging={!compact}
        scrollWheelZoom={!compact}
        doubleClickZoom={false}
        keyboard={false}
        touchZoom={!compact}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds shipments={shipments} />
        <HubMarkers hubs={hubs} />
        {shipments.map((s) => {
          const waypoints = s.route_waypoints || [];
          const latest = s.latest_tracking;
          const isHighRisk = s.risk_level === 'HIGH' || s.risk_level === 'CRITICAL';
          const isDelayed = s.status === 'DELAYED';
          const routeColor = isHighRisk ? '#ef4444' : isDelayed ? '#f59e0b' : '#0ea5e9';
          const routeOpacity = isHighRisk ? 0.6 : 0.2;

          return (
            <div key={s.id || s.shipment_ref}>
              {waypoints.length > 1 && (
                <Polyline
                  positions={waypoints.map((wp: number[]) => [wp[0], wp[1]] as [number, number])}
                  pathOptions={{
                    color: routeColor,
                    weight: isHighRisk ? 1.5 : 1,
                    opacity: routeOpacity,
                    dashArray: isHighRisk ? undefined : '4 3',
                    lineCap: 'round',
                  }}
                />
              )}
              {latest && (
                <Marker position={[latest.lat, latest.lng]} icon={getVehicleIcon(s.transport_mode)}>
                  <Popup>
                    <div style={{ fontFamily: 'Public Sans, sans-serif', padding: '2px 0' }}>
                      <div style={{ fontWeight: 700, color: '#0ea5e9', fontSize: '11px' }}>{s.shipment_ref}</div>
                      <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '1px' }}>{s.origin_name} → {s.destination_name}</div>
                      <div style={{ color: '#64748b', fontSize: '10px', marginTop: '1px' }}>{s.status?.replace(/_/g, ' ')}</div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </div>
          );
        })}
      </MapContainer>

      {!compact && (
        <div className="nx-map-legend">
          <span className="nx-map-legend-item"><span className="nx-legend-dot" style={{ background: '#0ea5e9' }} />Active</span>
          <span className="nx-map-legend-item"><span className="nx-legend-dot" style={{ background: '#ef4444' }} />Risk</span>
          <span className="nx-map-legend-item"><span className="nx-legend-dot" style={{ background: '#f59e0b' }} />Delayed</span>
          <span className="nx-map-legend-item"><span className="nx-legend-line" style={{ background: '#0ea5e9', opacity: 0.3 }} />Route</span>
        </div>
      )}
    </div>
  );
}
