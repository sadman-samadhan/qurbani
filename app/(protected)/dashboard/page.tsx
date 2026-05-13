"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, Map as MapIcon, ClipboardList, MessageCircle, User, 
  Plus, Search, Phone, MessageSquare, AlertCircle, MapPin,
  Clock, Users as UsersIcon, X, Loader2, Globe
} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

// Dynamic import for Leaflet map to prevent SSR issues
const DashboardMap = dynamic(() => import("@/components/map/DashboardMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  ),
});

const TRANSLATIONS = {
  en: {
    app_name: "QurbaniSathi",
    nearby_requests: "Nearby Requests",
    no_requests: "No requests nearby",
    post_request: "Post Request",
    shares_wanted: "Shares Wanted",
    budget: "Budget",
    cow_price: "Cow Price",
    not_specified: "Not specified",
    posted: "Posted",
    whatsapp: "WhatsApp",
    call: "Call",
    send_message: "Send Message",
    report: "Report this listing",
    anon: "Anonymous User",
    coming_soon: "Coming soon",
    nav_map: "Map",
    nav_my: "My Requests",
    nav_msg: "Messages",
    nav_profile: "Profile"
  },
  bn: {
    app_name: "কোরবানি সাথী",
    nearby_requests: "কাছের অনুরোধ",
    no_requests: "কাছে কোনো অনুরোধ নেই",
    post_request: "পোস্ট করুন",
    shares_wanted: "অংশ চাই",
    budget: "বাজেট",
    cow_price: "গরুর দাম",
    not_specified: "উল্লেখ করা হয়নি",
    posted: "পোস্ট করা হয়েছে",
    whatsapp: "WhatsApp",
    call: "কল করুন",
    send_message: "মেসেজ দিন",
    report: "রিপোর্ট করুন",
    anon: "পরিচয় গোপন",
    coming_soon: "শীঘ্রই আসছে",
    nav_map: "ম্যাপ",
    nav_my: "আমার অনুরোধ",
    nav_msg: "মেসেজ",
    nav_profile: "প্রোফাইল"
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "bn">("bn");
  const t = TRANSLATIONS[lang];

  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  // 1. Fetch User Profile
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile?.latitude || !profile?.longitude) {
        router.push("/setup-location");
        return;
      }

      setProfile(profile);
      setMapCenter([profile.latitude, profile.longitude]);
      fetchNearby(profile.latitude, profile.longitude);
    }
    init();
  }, [router]);

  // 2. Fetch Nearby Requests
  const fetchNearby = async (lat: number, lng: number) => {
    try {
      const { data, error } = await supabase.rpc("get_nearby_requests", {
        user_lat: lat,
        user_lng: lng,
        radius_km: 2
      });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error("Fetch error:", err);
      toast.error("কাছের অনুরোধগুলো আনতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  // 3. Realtime Subscription
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("share_requests_changes")
      .on(
        "postgres_changes",
        { event: "*", table: "share_requests" },
        () => {
          fetchNearby(profile.latitude, profile.longitude);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return (
    <div className="flex flex-col h-screen bg-background font-hind relative overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-border z-10">
        <div className="flex items-center gap-2">
          <BeefIcon className="w-8 h-8 text-primary" />
          <span className="font-bold text-xl text-primary">{t.app_name}</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLang(lang === "en" ? "bn" : "en")}
            className="flex items-center gap-1 text-sm font-bold text-text-muted hover:text-primary"
          >
            <Globe className="w-4 h-4" />
            {lang === "en" ? "বাংলা" : "EN"}
          </button>
          <Bell className="w-6 h-6 text-border cursor-not-allowed" />
        </div>
      </div>

      {/* Map Section */}
      <div className="relative h-[55vh] flex-shrink-0">
        {profile && mapCenter && (
          <DashboardMap 
            center={mapCenter}
            userPos={[profile.latitude, profile.longitude]}
            requests={requests}
            onMarkerClick={(req) => {
              setSelectedRequest(req);
              setMapCenter([req.latitude, req.longitude]);
            }}
          />
        )}
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-[1000]">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}
      </div>

      {/* Nearby Listings Horizontal Scroll */}
      <div className="p-4 overflow-hidden">
        <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
          {t.nearby_requests}
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {loading ? (
            [1, 2, 3].map(i => <SkeletonCard key={i} />)
          ) : requests.length > 0 ? (
            requests.map(req => (
              <RequestCard 
                key={req.id} 
                request={req} 
                t={t} 
                onClick={() => {
                  setSelectedRequest(req);
                  setMapCenter({ lat: req.latitude, lng: req.longitude });
                }} 
              />
            ))
          ) : (
            <div className="w-full py-8 text-center bg-white rounded-2xl border border-dashed border-border">
              <span className="text-4xl mb-2 block">🐄</span>
              <p className="text-text-muted">{t.no_requests}</p>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <div className="absolute bottom-24 right-4 z-20">
        <button 
          onClick={() => router.push("/post-request")}
          className="group relative bg-primary text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-8 h-8" />
          <span className="absolute right-full mr-3 bg-white text-primary text-xs font-bold px-3 py-2 rounded-lg shadow-md border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {t.post_request}
          </span>
        </button>
      </div>

      {/* Bottom Nav */}
      <div className="bg-white border-t border-border mt-auto flex items-center justify-around py-3 px-2 z-10">
        <NavButton icon={<MapIcon />} label={t.nav_map} active />
        <NavButton icon={<ClipboardList />} label={t.nav_my} onClick={() => router.push("/my-requests")} />
        <div className="relative group">
          <NavButton icon={<MessageCircle />} label={t.nav_msg} disabled />
          <span className="absolute -top-1 -right-1 bg-accent text-[8px] text-white px-1 rounded-full font-bold uppercase">soon</span>
        </div>
        <NavButton icon={<User />} label={t.nav_profile} onClick={() => router.push("/profile")} />
      </div>

      {/* Bottom Sheet Details */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={() => setSelectedRequest(null)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] shadow-2xl animate-in slide-in-from-bottom duration-300 pointer-events-auto max-h-[70vh] flex flex-col">
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto my-4" />
            <div className="overflow-y-auto px-6 pb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                  <span className="text-2xl font-bold text-primary">
                    {selectedRequest.full_name ? selectedRequest.full_name[0] : "?"}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">
                    {selectedRequest.full_name || t.anon}
                  </h3>
                  <div className="flex items-center gap-1 text-text-muted text-sm">
                    <MapPin className="w-4 h-4" />
                    {selectedRequest.area_name}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="ml-auto p-2 bg-background rounded-full"
                >
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <InfoItem 
                  label={t.shares_wanted} 
                  value={<ShareBoxes count={selectedRequest.shares_wanted} />} 
                />
                <InfoItem 
                  label={t.budget} 
                  value={selectedRequest.budget ? `৳${selectedRequest.budget.toLocaleString()}` : t.not_specified} 
                />
                <InfoItem 
                  label={t.cow_price} 
                  value={selectedRequest.cow_price_min ? `৳${selectedRequest.cow_price_min.toLocaleString()} - ৳${selectedRequest.cow_price_max.toLocaleString()}` : t.not_specified} 
                />
                <InfoItem 
                  label={t.posted} 
                  value={`${formatDistanceToNow(new Date(selectedRequest.created_at))} ago`} 
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <a 
                  href={`https://wa.me/88${selectedRequest.whatsapp_number || selectedRequest.phone_number}`}
                  target="_blank"
                  className="bg-primary text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <MessageSquare className="w-5 h-5" /> {t.whatsapp}
                </a>
                <a 
                  href={`tel:${selectedRequest.phone_number}`}
                  className="border-2 border-accent text-accent py-4 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-accent/5 active:scale-95 transition-all"
                >
                  <Phone className="w-5 h-5" /> {t.call}
                </a>
              </div>
              <button 
                onClick={() => toast.success(t.coming_soon)}
                className="w-full bg-background text-text-primary py-4 rounded-2xl flex items-center justify-center gap-2 font-bold mb-6 hover:bg-border transition-all"
              >
                <MessageCircle className="w-5 h-5" /> {t.send_message}
              </button>

              <button className="w-full text-text-muted text-xs flex items-center justify-center gap-1 hover:text-error transition-colors">
                <AlertCircle className="w-3 h-3" /> {t.report}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ icon, label, active = false, disabled = false, onClick }: any) {
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${
        active ? "text-primary" : "text-text-muted hover:text-primary"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-primary/10" : ""}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </button>
  );
}

function RequestCard({ request, t, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="flex-shrink-0 w-64 bg-white border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="bg-primary/10 text-primary px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
          {request.area_name?.split(",")[0] || "Area"}
        </div>
        <div className="flex items-center gap-1 text-text-muted text-[10px]">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(request.created_at))} ago
        </div>
      </div>
      <div className="mb-3">
        <p className="text-xs text-text-muted mb-1">{t.shares_wanted}</p>
        <ShareBoxes count={request.shares_wanted} mini />
      </div>
      <div className="flex items-center justify-between mt-4">
        <div>
          <p className="text-[10px] text-text-muted uppercase">{t.budget}</p>
          <p className="text-sm font-bold text-text-primary">
            {request.budget ? `৳${request.budget.toLocaleString()}` : "--"}
          </p>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://wa.me/88${request.whatsapp_number || request.phone_number}`, "_blank");
          }}
          className="bg-primary text-white p-2 rounded-xl"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ShareBoxes({ count, mini = false }: { count: number, mini?: boolean }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div 
          key={i} 
          className={`rounded-sm ${mini ? "w-2.5 h-2.5" : "w-4 h-4"} ${
            i < count ? "bg-primary shadow-sm" : "bg-border/50"
          }`}
        />
      ))}
    </div>
  );
}

function InfoItem({ label, value }: any) {
  return (
    <div>
      <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">{label}</p>
      <div className="text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-64 bg-white border border-border rounded-2xl p-4 animate-pulse">
      <div className="w-20 h-4 bg-background rounded-lg mb-3" />
      <div className="w-full h-8 bg-background rounded-lg mb-3" />
      <div className="flex justify-between items-center mt-4">
        <div className="w-20 h-4 bg-background rounded-lg" />
        <div className="w-8 h-8 bg-background rounded-xl" />
      </div>
    </div>
  );
}

function BeefIcon({ className }: { className?: string }) {
  return (
    <div className={`relative ${className} flex items-center justify-center`}>
      <span className="text-2xl">🐄</span>
    </div>
  );
}

