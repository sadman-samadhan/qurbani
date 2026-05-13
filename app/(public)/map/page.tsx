"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";

// Dynamic import for Leaflet map to prevent SSR issues
const PublicMap = dynamic(() => import("@/components/map/PublicMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center">
      <div className="text-gray-400 font-medium">Loading Map...</div>
    </div>
  ),
});

export default function PublicMapPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  // Fetch requests
  useEffect(() => {
    async function fetchRequests() {
      const { data, error } = await supabase
        .from("share_requests")
        .select("*")
        .eq("status", "open");
      
      if (data) {
        setRequests(data);
      }
    }
    fetchRequests();
  }, []);

  // Detect user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
      }, (err) => {
        console.warn("Geolocation denied or error:", err);
      });
    }
  }, []);

  return (
    <div className="relative h-screen w-full font-hind overflow-hidden">
      <PublicMap requests={requests} userPos={userPos} />
      
      {/* Overlay UI elements can be added here if needed */}
    </div>
  );
}
