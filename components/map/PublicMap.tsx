"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_CONFIG } from "@/lib/map";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Users, Clock, MapPin, LogIn } from "lucide-react";

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

interface PublicMapProps {
  requests: any[];
  userPos: [number, number] | null;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function PublicMap({ requests, userPos }: PublicMapProps) {
  const defaultPos: [number, number] = [MAP_CONFIG.defaultCenter.lat, MAP_CONFIG.defaultCenter.lng];

  return (
    <MapContainer
      center={userPos || defaultPos}
      zoom={13}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User Location and 2km Radius */}
      {userPos && (
        <>
          <Marker position={userPos} icon={userIcon} />
          <Circle 
            center={userPos} 
            radius={2000} 
            pathOptions={{ color: '#1B6B3A', fillColor: '#1B6B3A', fillOpacity: 0.08 }} 
          />
          <MapUpdater center={userPos} />
        </>
      )}

      {/* Listing Markers */}
      {requests.map((req) => (
        <Marker 
          key={req.id} 
          position={[req.latitude, req.longitude]} 
          icon={createShareMarker(req.shares_wanted)}
        >
          <Popup className="custom-popup">
            <div className="p-1 space-y-3 min-w-[200px]">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-text-primary text-base">
                  {req.area_name?.split(',')[0]}
                </h3>
                <span className="text-[10px] text-text-muted bg-background px-2 py-0.5 rounded-full border border-border">
                  {formatDistanceToNow(new Date(req.created_at))} ago
                </span>
              </div>
              
              <div className="space-y-2 py-2 border-y border-border">
                <div className="flex items-center gap-2 text-sm text-text-primary font-medium">
                  <Users className="w-4 h-4 text-primary" />
                  {req.shares_wanted} Shares Wanted
                </div>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <MapPin className="w-4 h-4 text-primary" />
                  {req.area_name}
                </div>
              </div>

              <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 text-center">
                <p className="text-xs text-text-muted mb-2">
                  Login to see contact details
                </p>
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-opacity-90 transition-all"
                >
                  <LogIn className="w-3 h-3" /> Login / লগইন
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
