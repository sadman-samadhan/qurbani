"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, Navigation, Loader2, CheckCircle2, ChevronRight, Map as MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { searchAddress, reverseGeocode, MAP_CONFIG } from "@/lib/map";

// Dynamic import for Leaflet map to prevent SSR issues
const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  ),
});

export default function SetupLocationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState<"gps" | "search" | "map" | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; area: string } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleMapClick = async (lat: number, lng: number) => {
    updateLocationFromCoords(lat, lng);
  };

  const updateLocationFromCoords = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const data = await reverseGeocode(lat, lng);
      const area = data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setLocation({ lat, lng, area });
    } catch (err) {
      console.error("Geocoding error:", err);
      setLocation({ lat, lng, area: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
    } finally {
      setLoading(false);
    }
  };

  const handleGPS = () => {
    setLoading(true);
    setMethod("gps");
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await updateLocationFromCoords(latitude, longitude);
      },
      (err) => {
        toast.error("Could not detect location. Please try search or manual pin.");
        setLoading(false);
      }
    );
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const data = await searchAddress(query);
      setSuggestions(data || []);
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const handleSelectSuggestion = (s: any) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    const area = s.display_name;
    setLocation({ lat, lng, area });
    setSuggestions([]);
    setSearchQuery(area);
    setMethod("search");
  };

  const handleSave = async () => {
    if (!location) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("profiles")
        .update({
          latitude: location.lat,
          longitude: location.lng,
          area_name: location.area,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Location saved successfully!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Error saving location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 font-hind">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Progress Header */}
        <div className="mb-8">
          <p className="text-primary font-bold text-sm uppercase tracking-wider mb-2">
            Step 2 of 2
          </p>
          <h1 className="text-3xl font-bold text-text-primary">
            Set Your Location / আপনার অবস্থান ঠিক করুন
          </h1>
          <div className="w-full h-2 bg-border rounded-full mt-4">
            <div className="w-full h-full bg-primary rounded-full" />
          </div>
        </div>

        {/* Location Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Card 1: GPS */}
          <button
            onClick={handleGPS}
            className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col items-center gap-3 ${
              method === "gps" ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/50"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-text-primary">Current Location</h3>
              <p className="text-xs text-text-muted">আমার অবস্থান</p>
            </div>
          </button>

          {/* Card 2: Search */}
          <button
            onClick={() => { setMethod("search"); setLocation(null); }}
            className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col items-center gap-3 ${
              method === "search" ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/50"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-text-primary">Search Area</h3>
              <p className="text-xs text-text-muted">এলাকা খুঁজুন</p>
            </div>
          </button>

          {/* Card 3: Map */}
          <button
            onClick={() => { setMethod("map"); setLocation(null); }}
            className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col items-center gap-3 ${
              method === "map" ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/50"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MapIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-text-primary">Drop a Pin</h3>
              <p className="text-xs text-text-muted">ম্যাপে পিন দিন</p>
            </div>
          </button>
        </div>

        {/* Dynamic Section */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-warm min-h-[400px] flex flex-col">
          {method === "gps" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              {loading ? (
                <>
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-text-primary font-medium">Detecting your location...</p>
                  <p className="text-text-muted text-sm">আপনার অবস্থান খুঁজে দেখা হচ্ছে...</p>
                </>
              ) : location ? (
                <div className="w-full flex-1">
                   <div className="mb-4 p-4 bg-primary/10 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                    <div className="text-left">
                      <p className="text-xs text-primary font-bold uppercase tracking-tight">Location Detected</p>
                      <p className="text-text-primary font-medium line-clamp-1">{location.area}</p>
                    </div>
                  </div>
                  <div className="h-[250px] w-full rounded-xl overflow-hidden border border-border">
                    <LeafletMap 
                      center={{ lat: location.lat, lng: location.lng }}
                      markers={[{ lat: location.lat, lng: location.lng }]}
                      zoom={15}
                    />
                  </div>
                </div>
              ) : (
                <Navigation className="w-16 h-16 text-border mb-4" />
              )}
            </div>
          )}

          {method === "search" && (
            <div className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Type area name (e.g. Dhanmondi)..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full text-left px-4 py-3 hover:bg-background transition-colors text-sm border-b last:border-0"
                      >
                        {s.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {location && (
                <div className="h-[250px] w-full rounded-xl overflow-hidden border border-border">
                  <LeafletMap 
                    center={{ lat: location.lat, lng: location.lng }}
                    markers={[{ lat: location.lat, lng: location.lng }]}
                    zoom={15}
                  />
                </div>
              )}
            </div>
          )}

          {method === "map" && (
            <div className="flex-1 relative min-h-[400px]">
              <LeafletMap 
                center={location ? { lat: location.lat, lng: location.lng } : MAP_CONFIG.defaultCenter}
                markers={location ? [{ lat: location.lat, lng: location.lng }] : []}
                onClick={handleMapClick}
                zoom={13}
              />
              {!location && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
                  <div className="bg-white/90 px-4 py-2 rounded-full text-xs font-bold shadow-md border border-primary/20">
                    Tap anywhere on the map to set location
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer of the box */}
          {location && (
            <div className="p-6 bg-background border-t border-border mt-auto">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs text-text-muted font-bold uppercase mb-1">Confirming Location</p>
                  <p className="text-text-primary font-bold line-clamp-1">{location.area}</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full md:w-auto bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-md shadow-primary/20"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>Confirm & Continue <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Skip Link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-text-muted text-sm hover:text-primary transition-colors hover:underline"
          >
            Skip for now / আপাতত বাদ দিন
          </button>
        </div>
      </div>
    </div>
  );
}
