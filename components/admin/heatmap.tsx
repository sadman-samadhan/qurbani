"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HeatmapLayer from "./HeatmapLayer";

export default function AdminHeatmap({ data }: { data: any[] }) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-border">
      <MapContainer
        center={[23.8103, 90.4125]} // Dhaka
        zoom={7}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatmapLayer data={data} />
      </MapContainer>
    </div>
  );
}
