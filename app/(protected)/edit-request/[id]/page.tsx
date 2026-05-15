"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Lock, CheckCircle2, MessageSquare,
  Phone, MapPin, Info, Pencil
} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslations } from "next-intl";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-background flex items-center justify-center">
      <LoadingSpinner size={24} className="!gap-0" />
    </div>
  ),
});

const EID_DATE = process.env.NEXT_PUBLIC_EID_DATE || "2026-05-27";

export default function EditRequestPage() {
  const router = useRouter();
  const { id } = useParams();
  const t = useTranslations("post");
  const tc = useTranslations("common");
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
  const [hideName, setHideName] = useState(false);
  const [hidePhone, setHidePhone] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch existing request
      const { data: request, error } = await supabase
        .from("share_requests")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id) // Security check
        .single();

      if (error || !request) {
        toast.error("Post not found");
        router.push("/my-requests");
        return;
      }

      setSharesWanted(request.shares_wanted);
      setBudget(request.budget?.toString() || "");
      setMinPrice(request.cow_price_min?.toString() || "");
      setMaxPrice(request.cow_price_max?.toString() || "");
      setWhatsapp(request.whatsapp_number || "");
      setPhone(request.phone_number || "");
      setHideName(request.hide_name || false);
      setHidePhone(request.hide_phone || false);
      
      setLoading(false);
    }
    fetchData();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!whatsapp.trim() && !phone.trim() && !hidePhone) {
      toast.error(t("contact_required"));
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found");

      const { error } = await supabase
        .from("share_requests")
        .update({
          shares_wanted: sharesWanted,
          budget: budget ? parseInt(budget) : null,
          cow_price_min: minPrice ? parseInt(minPrice) : null,
          cow_price_max: maxPrice ? parseInt(maxPrice) : null,
          whatsapp_number: whatsapp,
          phone_number: phone,
          hide_name: hideName,
          hide_phone: hidePhone,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/my-requests");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "আপডেট করতে সমস্যা হয়েছে");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-in fade-in duration-500">
        <div className="bg-white rounded-full p-6 shadow-xl mb-6 scale-110">
          <CheckCircle2 className="w-20 h-20 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">{tc("success")}</h1>
        <p className="text-xl font-medium text-text-muted">{t("update_success") || "Post updated!"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-hind">
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-border sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-background rounded-full transition-colors active:scale-95">
          <ArrowLeft className="w-6 h-6 text-text-primary" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          {t("edit_title")}
        </h1>
      </div>

      {/* Desktop two-column / Mobile single column */}
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:max-w-6xl lg:mx-auto lg:px-8 lg:pt-8 lg:pb-12">

        {/* Left: form */}
        <form
          id="edit-form"
          onSubmit={handleSubmit}
          className="max-w-xl mx-auto lg:max-w-none p-4 lg:p-0 space-y-6 mt-4 lg:mt-0 pb-28 lg:pb-0"
        >
          {/* Field 1: Shares Wanted */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <label className="block text-sm font-bold text-text-primary mb-1 uppercase tracking-wider">
              {t("shares_label")}
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
                      className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center active:scale-95 ${
                        isLast
                          ? "border-accent bg-accent/10 text-accent cursor-not-allowed"
                          : isSelected
                            ? "border-primary bg-primary text-white shadow-md shadow-primary/20"
                            : "border-border bg-white text-text-muted hover:border-primary/50"
                      }`}
                    >
                      {isLast ? <Lock className="w-5 h-5" /> : shareNum}
                    </button>
                    {isLast && <span className="text-[10px] font-bold text-accent">{t("others_label")}</span>}
                  </div>
                );
              })}
            </div>
            <p className="text-center font-bold text-primary mb-2">
              {t("shares_summary", { count: sharesWanted })}
            </p>
            <div className="flex items-center gap-2 text-xs text-text-muted bg-background p-3 rounded-lg border border-dashed border-border">
              <Info className="w-4 h-4 text-primary flex-shrink-0" />
              {t("shares_max_note")}
            </div>
          </div>

          {/* Field 2 & 3: Budget and Price Range */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
            <div>
              <label className="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">
                {t("budget_label")}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted text-xl">৳</span>
                <input
                  type="number"
                  placeholder="40000"
                  className="w-full pl-10 pr-4 py-3 text-base rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">
                {t("price_range_label")}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">Min ৳</span>
                  <input
                    type="number"
                    placeholder="60000"
                    className="w-full pl-14 pr-4 py-3 text-base rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none transition-all"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">Max ৳</span>
                  <input
                    type="number"
                    placeholder="80000"
                    className="w-full pl-14 pr-4 py-3 text-base rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none transition-all"
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
                {t("whatsapp_label")}
              </label>
              <input
                type="tel"
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-3 text-base rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none transition-all"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                {t("phone_label")}
              </label>
              <input
                type="tel"
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-3 text-base rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none transition-all"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Field 6: Location (mobile thumbnail + always-visible text) */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm opacity-80">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-bold text-text-primary uppercase tracking-wider">
                {t("location_label")}
              </label>
            </div>
            <div className="flex gap-4 items-center">
              {/* Thumbnail: visible on mobile, hidden on desktop (full map in right col) */}
              <div className="w-24 h-24 rounded-xl border border-border flex-shrink-0 overflow-hidden lg:hidden">
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

          {/* Field 7: Privacy Toggles */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text-primary">
                  {t("hide_name_label")}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {t("hide_name_sub")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHideName(!hideName)}
                aria-pressed={hideName}
                className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${hideName ? "bg-primary" : "bg-border"}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${hideName ? "left-7" : "left-1"}`} />
              </button>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text-primary">
                  {t("hide_phone_label")}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {t("hide_phone_sub")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHidePhone(!hidePhone)}
                aria-pressed={hidePhone}
                className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${hidePhone ? "bg-primary" : "bg-border"}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${hidePhone ? "left-7" : "left-1"}`} />
              </button>
            </div>
          </div>

          {/* Submit — desktop only */}
          <div className="hidden lg:block">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-xl shadow-xl shadow-primary/20 hover:bg-primary-light active:scale-[0.99] transition-all flex items-center justify-center gap-3"
            >
              {submitting ? (
                <LoadingSpinner size={28} className="!gap-0 !flex-row !text-white" />
              ) : t("update")}
            </button>
          </div>
        </form>

        {/* Right: map preview (desktop only) */}
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {t("location_label")}
                </h3>
              </div>
              <div className="h-64 w-full">
                {profile?.latitude && profile?.longitude ? (
                  <LeafletMap
                    center={{ lat: profile.latitude, lng: profile.longitude }}
                    markers={[{ lat: profile.latitude, lng: profile.longitude }]}
                    zoom={14}
                  />
                ) : (
                  <div className="w-full h-full bg-background flex flex-col items-center justify-center gap-2 text-text-muted">
                    <MapPin className="w-8 h-8 text-border" />
                    <p className="text-sm">No location set</p>
                  </div>
                )}
              </div>
              {profile?.area_name && (
                <div className="px-5 py-3 border-t border-border">
                  <p className="text-sm text-text-secondary line-clamp-2">{profile.area_name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky submit footer */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/95 backdrop-blur-sm border-t border-border px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] z-20">
        <button
          type="submit"
          form="edit-form"
          disabled={submitting}
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:bg-primary-light active:scale-[0.99] transition-all flex items-center justify-center gap-3"
        >
          {submitting ? (
            <LoadingSpinner size={24} className="!gap-0 !flex-row !text-white" />
          ) : t("update")}
        </button>
      </div>
    </div>
  );
}
