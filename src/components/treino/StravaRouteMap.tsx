import { useMemo } from 'react';
import { Box } from '@mui/material';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { decodePolyline } from '../../utils/polylineDecoder';

function FitBounds({ bounds }: { bounds: LatLngBounds }) {
  const map = useMap();
  useMemo(() => {
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, bounds]);
  return null;
}

interface Props {
  polyline: string;
  height?: number;
}

export default function StravaRouteMap({ polyline, height = 200 }: Props) {
  const positions = useMemo(() => decodePolyline(polyline), [polyline]);

  if (positions.length < 2) return null;

  const bounds = useMemo(() => {
    const lats = positions.map((p) => p[0]);
    const lngs = positions.map((p) => p[1]);
    return new LatLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
  }, [positions]);

  return (
    <Box sx={{ mt: 1.5, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
      <MapContainer
        style={{ height, width: '100%' }}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
        doubleClickZoom={false}
        touchZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline
          positions={positions}
          pathOptions={{ color: '#FC4C02', weight: 3.5, opacity: 0.9 }}
        />
        <FitBounds bounds={bounds} />
      </MapContainer>
    </Box>
  );
}
