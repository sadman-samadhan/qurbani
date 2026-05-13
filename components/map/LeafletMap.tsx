"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from '@/lib/map';

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

const UserIcon = L.divIcon({
  className: 'user-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 bg-accent rounded-full animate-ping opacity-20"></div>
      <div class="relative w-4 h-4 bg-accent border-2 border-white rounded-full shadow-lg"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});


interface MapEventsProps {
  onClick: (lat: number, lng: number) => void;
}

function MapEvents({ onClick }: MapEventsProps) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface UpdaterProps {
  center: { lat: number; lng: number };
}

function MapUpdater({ center }: UpdaterProps) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], map.getZoom());
  }, [center, map]);
  return null;
}

interface LeafletMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  showRadius?: number; // In kilometers
  userLocation?: { lat: number; lng: number };
  markers?: Array<{ 
    lat: number; 
    lng: number; 
    title?: string; 
    label?: string | number;
    onClick?: () => void;
  }>;
  onClick?: (lat: number, lng: number) => void;
  className?: string;
}

export default function LeafletMap({
  center = MAP_CONFIG.defaultCenter,
  zoom = MAP_CONFIG.defaultZoom,
  showRadius,
  userLocation,
  markers = [],
  onClick,
  className = "h-full w-full"
}: LeafletMapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className={className}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution={MAP_CONFIG.attribution}
        url={MAP_CONFIG.tileUrl}
      />
      {showRadius && userLocation && (
        <Circle 
          center={[userLocation.lat, userLocation.lng]}
          radius={showRadius * 1000} // Convert km to meters
          pathOptions={{
            color: '#1B6B3A',
            fillColor: '#1B6B3A',
            fillOpacity: 0.12,
            weight: 1,
          }}
        />
      )}
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={UserIcon} />
      )}
      {markers.map((marker, idx) => {
        const icon = marker.label ? L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="bg-primary text-white w-8 h-8 rounded-full rounded-bl-none rotate-45 flex items-center justify-center shadow-lg border-2 border-white transition-transform hover:scale-110">
            <span class="-rotate-45 text-xs font-bold">${marker.label}</span>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        }) : new L.Icon.Default();

        return (
          <Marker 
            key={idx} 
            position={[marker.lat, marker.lng]} 
            icon={icon}
            eventHandlers={{
              click: marker.onClick,
            }}
          >
            {marker.title && <Popup>{marker.title}</Popup>}
          </Marker>
        );
      })}
      <MapUpdater center={center} />
      {onClick && <MapEvents onClick={onClick} />}
    </MapContainer>
  );
}
