"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Lock, CheckCircle2, Loader2, MessageSquare, 
  Phone, MapPin, Info, Check
} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";

// Dynamic import for Leaflet map to prevent SSR issues
const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-background flex items-center justify-center">
      <Loader2 className="w-4 h-4 text-primary animate-spin" />
    </div>
  ),
});

const EID_DATE = process.env.NEXT_PUBLIC_EID_DATE || "2025-06-07";

export default function PostRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [profile, setProfile] = useState<any>(null);
  const [sharesWanted, setSharesWanted] = useState(1);
  const [budget, setBudget] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [showName, setShowName] = useState(false);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setProfile(profile);
        setWhatsapp(profile.phone || "");
        setPhone(profile.phone || "");
      }
      setLoading(false);
    }
    getProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!whatsapp.trim() && !phone.trim()) {
      toast.error("কমপক্ষে একটি যোগাযোগের মাধ্যম দিন (WhatsApp অথবা ফোন)");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found");

      const { error } = await supabase
        .from("share_requests")
        .insert({
          user_id: user.id,
          shares_wanted: sharesWanted,
          budget: budget ? parseInt(budget) : null,
          cow_price_min: minPrice ? parseInt(minPrice) : null,
          cow_price_max: maxPrice ? parseInt(maxPrice) : null,
          whatsapp_number: whatsapp,
          phone_number: phone,
          area_name: profile.area_name,
          latitude: profile.latitude,
          longitude: profile.longitude,
          status: "open",
          expires_at: EID_DATE,
        });

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "পোস্ট করতে সমস্যা হয়েছে");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-in fade-in duration-500">
        <div className="bg-white rounded-full p-6 shadow-xl mb-6 scale-110">
          <CheckCircle2 className="w-20 h-20 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Posted!</h1>
        <p className="text-xl font-medium text-text-muted">পোস্ট হয়েছে!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-hind pb-10">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-border sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-background rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-text-primary" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          Post Share Request / শেয়ার পোস্ট করুন
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-4 space-y-8 mt-4">
        {/* Field 1: Shares Wanted */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
          <label className="block text-sm font-bold text-text-primary mb-1 uppercase tracking-wider">
            How many shares do you want? / আপনি কতটি ভাগ চান?
          </label>
          <div className="flex gap-2 my-6 justify-between">
            {Array.from({ length: 7 }).map((_, i) => {
              const shareNum = i + 1;
              const isLast = shareNum === 7;
              const isSelected = shareNum <= sharesWanted;

              return (
                <div key={shareNum} className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => setSharesWanted(shareNum)}
                    className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center ${
                      isLast 
                        ? "border-accent bg-accent/10 text-accent cursor-not-allowed" 
                        : isSelected 
                          ? "border-primary bg-primary text-white shadow-md shadow-primary/20" 
                          : "border-border bg-white text-text-muted hover:border-primary/50"
                    }`}
                  >
                    {isLast ? <Lock className="w-5 h-5" /> : shareNum}
                  </button>
                  {isLast && <span className="text-[10px] font-bold text-accent">others</span>}
                </div>
              );
            })}
          </div>
          <p className="text-center font-bold text-primary mb-2">
            You want {sharesWanted} shares out of 7 / ৭টির মধ্যে আপনি {sharesWanted} ভাগ চান
          </p>
          <div className="flex items-center gap-2 text-xs text-text-muted bg-background p-3 rounded-lg border border-dashed border-border">
            <Info className="w-4 h-4 text-primary" />
            Maximum 6 shares per person / একজন সর্বোচ্চ ৬ ভাগ নিতে পারবেন
          </div>
        </div>

        {/* Field 2 & 3: Budget and Price Range */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">
              Your budget (optional) / আপনার বাজেট (ঐচ্ছিক)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted text-xl">৳</span>
              <input
                type="number"
                placeholder="40000"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none transition-all"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">
              Preferred cow price range (optional) / পছন্দের গরুর দাম (ঐচ্ছিক)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">Min ৳</span>
                <input
                  type="number"
                  placeholder="60000"
                  className="w-full pl-14 pr-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">Max ৳</span>
                <input
                  type="number"
                  placeholder="80000"
                  className="w-full pl-14 pr-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Field 4 & 5: Contacts */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              WhatsApp Number / হোয়াটসঅ্যাপ নম্বর
            </label>
            <input
              type="tel"
              placeholder="01XXXXXXXXX"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none transition-all"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              Phone Number / ফোন নম্বর
            </label>
            <input
              type="tel"
              placeholder="01XXXXXXXXX"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none transition-all"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        {/* Field 6: Location */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <label className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Location / অবস্থান
            </label>
            <Link href="/setup-location" className="text-xs font-bold text-primary hover:underline">
              Change location
            </Link>
          </div>
          <div className="flex gap-4 items-center">
            <div className="w-24 h-24 rounded-xl border border-border flex-shrink-0 overflow-hidden">
              {profile?.latitude && profile?.longitude ? (
                <LeafletMap 
                  center={{ lat: profile.latitude, lng: profile.longitude }}
                  markers={[{ lat: profile.latitude, lng: profile.longitude }]}
                  zoom={13}
                />
              ) : (
                <div className="w-full h-full bg-background flex items-center justify-center">
                   <MapPin className="w-6 h-6 text-border" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-text-primary flex items-center gap-1">
                <MapPin className="w-4 h-4 text-primary" />
                {profile?.area_name?.split(",")[0] || "Location set"}
              </p>
              <p className="text-xs text-text-muted mt-1 line-clamp-2">
                {profile?.area_name}
              </p>
            </div>
          </div>
        </div>

        {/* Field 7: Anonymity Toggle */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-text-primary">
                {showName ? "Show my name / নাম দেখান" : "Stay anonymous / পরিচয় গোপন রাখুন"}
              </p>
              <p className="text-xs text-text-muted">
                {showName ? "Your name will be visible to others" : "Only your requested shares will be visible"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowName(!showName)}
              className={`w-14 h-8 rounded-full transition-all relative ${showName ? 'bg-primary' : 'bg-border'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${showName ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="space-y-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3"
          >
            {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Post Request / পোস্ট করুন"}
          </button>
          
          <div className="text-center space-y-1">
            <p className="text-[10px] text-text-muted">
              This request will automatically expire on Eid ul-Adha (June 7, 2025)
            </p>
            <p className="text-[10px] text-text-muted">
              এই পোস্টটি ঈদুল আযহার দিন (৭ জুন ২০২৫) স্বয়ংক্রিয়ভাবে মেয়াদোত্তীর্ণ হবে
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
