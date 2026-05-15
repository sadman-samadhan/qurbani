"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Logo from "@/components/ui/Logo";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// Dynamic import for Leaflet map to prevent SSR issues
const PublicMap = dynamic(() => import("@/components/map/PublicMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-background flex flex-col items-center justify-center">
      <LoadingSpinner />
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
    <div className="relative h-screen w-full font-hind overflow-hidden" style={{ height: "100dvh" }}>
      {/* Floating Header */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          <Link
            href="/"
            className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-2xl shadow-xl border border-border flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all group active:scale-95"
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6 group-active:scale-90 transition-transform" />
          </Link>
          <div className="bg-white/80 backdrop-blur-md px-3 sm:px-4 py-2 rounded-2xl border border-border shadow-lg">
            <Logo width={20} height={20} />
          </div>
        </div>

        <div className="pointer-events-auto">
          <Link
            href="/login"
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-white font-bold rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-sm whitespace-nowrap"
          >
            Login / লগইন
          </Link>
        </div>
      </div>

      <PublicMap requests={requests} userPos={userPos} />
    </div>
  );
}
