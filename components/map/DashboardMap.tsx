"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's broken default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

// Custom green circular markers
const createShareMarker = (sharesWanted: number) => L.divIcon({
  html: `<div style="background:#1B6B3A;color:white;width:32px;height:32px;
         border-radius:50%;display:flex;align-items:center;justify-content:center;
         font-weight:bold;font-size:14px;border:2px solid #D4AF37;
         box-shadow:0 2px 8px rgba(0,0,0,0.3)">${sharesWanted}</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Gold pulsing user dot
const userIcon = L.divIcon({
  className: 'user-marker-pulse',
  html: `
    <style>
      .user-marker-pulse {
        position: relative;
      }
      .pulse-dot {
        width: 12px;
        height: 12px;
        background: #D4AF37;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 8px rgba(212, 175, 55, 0.8);
      }
      .pulse-ring {
        position: absolute;
        width: 32px;
        height: 32px;
        border: 2px solid #D4AF37;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: pulse 2s infinite ease-out;
      }
      @keyframes pulse {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
        100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
      }
    </style>
    <div class="pulse-dot"></div>
    <div class="pulse-ring"></div>
  `,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

interface DashboardMapProps {
  requests: any[];
  userPos: [number, number];
  onMarkerClick: (req: any) => void;
  center: [number, number];
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function DashboardMap({ requests, userPos, onMarkerClick, center }: DashboardMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={14}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User Location and 2km Radius */}
      <Marker position={userPos} icon={userIcon} />
      <Circle 
        center={userPos} 
        radius={2000} 
        pathOptions={{ color: '#1B6B3A', fillColor: '#1B6B3A', fillOpacity: 0.08 }} 
      />
      <MapUpdater center={center} />

      {/* Listing Markers */}
      {requests.map((req) => (
        <Marker 
          key={req.id} 
          position={[req.latitude, req.longitude]} 
          icon={createShareMarker(req.shares_wanted)}
          eventHandlers={{
            click: () => onMarkerClick(req)
          }}
        />
      ))}
    </MapContainer>
  );
}
