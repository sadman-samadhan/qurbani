"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Phone, MessageSquare, AlertCircle, MapPin,
  Clock, Users as UsersIcon, X, Globe, UserPlus, CheckCircle2,
  Map as MapIcon, ClipboardList, MessageCircle, User
} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import Image from "next/image";
import Logo from "@/components/ui/Logo";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import NotificationsBell from "@/components/ui/NotificationsBell";
import { useTranslations, useLocale } from "next-intl";
import { setLocale } from "@/app/actions/locale";

// Dynamic import for Leaflet map to prevent SSR issues
const DashboardMap = dynamic(() => import("@/components/map/DashboardMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center">
      <LoadingSpinner size={32} />
    </div>
  ),
});

export default function DashboardPage() {
  const router = useRouter();
  const td = useTranslations("dashboard");
  const tm = useTranslations("map_page");
  const locale = useLocale();

  const [profile, setProfile] = useState<any>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [nearbyRequests, setNearbyRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [membership, setMembership] = useState<any>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinSharesCount, setJoinSharesCount] = useState(0);
  const [joiningLoading, setJoiningLoading] = useState(false);

  const handleLangToggle = async () => {
    const next = locale === "en" ? "bn" : "en";
    await setLocale(next);
    router.refresh();
  };

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
      fetchNearby(profile.latitude, profile.longitude, user.id);

      // Fetch initial unread count
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    }
    init();
  }, [router]);

  // 2. Fetch Requests
  const fetchNearby = async (lat: number, lng: number, userId: string) => {
    try {
      // 1. Fetch my own request to get my_shares
      const { data: myRequest } = await supabase
        .from('share_requests')
        .select('shares_wanted')
        .eq('user_id', userId)
        .eq('status', 'open')
        .maybeSingle();

      // 2. Fetch requests
      const [nearbyRes, allRes] = await Promise.all([
        supabase.rpc("get_nearby_requests", {
          user_lat: lat,
          user_lng: lng,
          radius_km: 2,
          my_shares: myRequest?.shares_wanted || 0
        }),
        supabase
          .from("share_requests")
          .select("*")
          .eq("status", "open")
      ]);

      if (nearbyRes.error) throw nearbyRes.error;
      if (allRes.error) throw allRes.error;

      const nearbyData = nearbyRes.data || [];
      const allData = allRes.data || [];
      const allIds = Array.from(new Set([...nearbyData.map((r: any) => r.id), ...allData.map((r: any) => r.id)]));

      if (allIds.length > 0) {
        const [membersRes, myMembershipsRes] = await Promise.all([
          supabase
            .from('request_members')
            .select('request_id, user_id, shares_taken')
            .in('request_id', allIds)
            .eq('status', 'approved'),
          supabase
            .from('request_members')
            .select('*')
            .in('request_id', allIds)
            .eq('user_id', userId)
        ]);

        // Fetch profiles for all member user_ids AND all request owner user_ids
        const ownerUserIds = Array.from(new Set([...nearbyData.map((r: any) => r.user_id), ...allData.map((r: any) => r.user_id)]));
        const memberUserIds = Array.from(new Set((membersRes.data || []).map((m: any) => m.user_id)));
        const allProfileIds = Array.from(new Set([...ownerUserIds, ...memberUserIds]));

        const profilesMap: Record<string, any> = {};
        if (allProfileIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, hide_name')
            .in('id', allProfileIds);
          profilesData?.forEach((p: any) => { profilesMap[p.id] = p; });
        }

        const membersMap: Record<string, any[]> = {};
        membersRes.data?.forEach((m: any) => {
          if (!membersMap[m.request_id]) membersMap[m.request_id] = [];
          const profile = profilesMap[m.user_id];
          membersMap[m.request_id].push({
            user_id: m.user_id,
            shares_taken: m.shares_taken,
            full_name: profile?.hide_name ? null : profile?.full_name
          });
        });

        const myMembershipMap: Record<string, any> = {};
        myMembershipsRes.data?.forEach(m => {
          myMembershipMap[m.request_id] = m;
        });

        const enrich = (req: any) => {
          const ownerProfile = profilesMap[req.user_id];
          return {
            ...req,
            // full_name: prefer what's already on req (from RPC join), fallback to profiles fetch
            full_name: req.full_name ?? (ownerProfile?.full_name || null),
            // hide_name comes from share_requests on both paths; keep it as-is
            members: membersMap[req.id] || [],
            myMembership: myMembershipMap[req.id] || null
          };
        };

        const enrichedNearby = nearbyData.map(enrich).filter((req: any) => req.user_id !== userId);
        const enrichedAll = allData.map(enrich);

        setNearbyRequests(enrichedNearby);
        setAllRequests(enrichedAll);
      } else {
        setNearbyRequests([]);
        setAllRequests([]);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      toast.error("অনুরোধগুলো আনতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  // Check membership when request is selected
  useEffect(() => {
    if (!selectedRequest || !profile) {
      setMembership(null);
      setShowJoinModal(false);
      return;
    }
    setMembership(selectedRequest.myMembership || null);
  }, [selectedRequest, profile]);

  const handleJoinRequest = async () => {
    if (!joinSharesCount || !selectedRequest || !profile) return;
    setJoiningLoading(true);
    try {
      const res = await fetch("/api/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: selectedRequest.id,
          shares_taken: joinSharesCount
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");

      toast.success(
        data.status === "approved"
          ? (locale === "en" ? "Joined successfully!" : "সফলভাবে যোগ দেওয়া হয়েছে!")
          : (locale === "en" ? "Request sent! Waiting for approval." : "অনুরোধ পাঠানো হয়েছে!")
      );
      setShowJoinModal(false);
      setJoinSharesCount(0);
      setSelectedRequest(null);
      fetchNearby(profile.latitude, profile.longitude, profile.id);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setJoiningLoading(false);
    }
  };

  // 3. Realtime Subscription — share_requests
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("share_requests_changes")
      .on(
        "postgres_changes" as any,
        { event: "*", table: "share_requests" },
        () => {
          fetchNearby(profile.latitude, profile.longitude, profile.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // 4. Realtime Subscription — unread message count
  useEffect(() => {
    if (!profile) return;

    const refetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", profile.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    };

    const channel = supabase
      .channel("unread_messages")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${profile.id}` },
        refetchUnread
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return (
    <div className="flex flex-col h-screen bg-background font-hind relative overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-border z-[3000]">
        <Logo width={32} height={32} />
        <div className="flex items-center gap-4">
          <button
            onClick={handleLangToggle}
            className="flex items-center gap-1 text-sm font-bold text-text-muted hover:text-primary"
          >
            <Globe className="w-4 h-4" />
            {locale === "en" ? "বাংলা" : "EN"}
          </button>
          <NotificationsBell userId={profile?.id} />
        </div>
      </div>

      {/* Map Section */}
      <div className="relative h-[55vh] flex-shrink-0">
        {profile && mapCenter && (
          <DashboardMap
            center={mapCenter}
            userPos={[profile.latitude, profile.longitude]}
            requests={allRequests}
            onMarkerClick={(req) => {
              setSelectedRequest(req);
              setMapCenter([req.latitude, req.longitude]);
            }}
          />
        )}
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-[1000]">
            <LoadingSpinner />
          </div>
        )}
      </div>

      {/* Nearby Listings Horizontal Scroll */}
      <div className="p-4 overflow-hidden">
        <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Image src="/images/cow.png" alt="" width={16} height={16} className="object-contain" />
          {td("nearby")}
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {loading ? (
            [1, 2, 3].map(i => <SkeletonCard key={i} />)
          ) : nearbyRequests.length > 0 ? (
            nearbyRequests.map(req => (
              <RequestCard
                key={req.id}
                request={req}
                onClick={() => {
                  setSelectedRequest(req);
                  setMapCenter([req.latitude, req.longitude]);
                }}
              />
            ))
          ) : (
            <div className="w-full py-8 text-center bg-white rounded-2xl border border-dashed border-border">
              <span className="text-4xl mb-2 block">🐄</span>
              <p className="text-text-muted">{td("no_requests")}</p>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <div className="absolute bottom-24 right-4 z-[3000]">
        <button
          onClick={() => router.push("/post-request")}
          className="group relative bg-primary text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-8 h-8" />
          <span className="absolute right-full mr-3 bg-white text-primary text-xs font-bold px-3 py-2 rounded-lg shadow-md border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {td("post_new")}
          </span>
        </button>
      </div>

      {/* Bottom Nav */}
      <div className="bg-white border-t border-border mt-auto flex items-center justify-around py-3 px-2 z-10">
        <NavButton icon={<MapIcon />} label={td("map")} active />
        <NavButton icon={<ClipboardList />} label={td("my_posts")} onClick={() => router.push("/my-requests")} />
        <div className="relative group">
          <NavButton icon={<MessageCircle />} label={td("messages")} onClick={() => router.push("/messages")} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-error text-[8px] text-white px-1.5 py-0.5 rounded-full font-bold min-w-[16px] text-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <NavButton icon={<User />} label={td("profile")} onClick={() => router.push("/profile")} />
      </div>

      {/* Bottom Sheet Details */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={() => setSelectedRequest(null)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] shadow-2xl animate-in slide-in-from-bottom duration-300 pointer-events-auto max-h-[85vh] flex flex-col">
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto my-4 flex-shrink-0" />
            <div className="overflow-y-auto px-6 pt-2 pb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">
                    {selectedRequest.area_name}
                  </h3>
                  <div className="flex items-center gap-1 text-text-muted text-sm">
                    <Clock className="w-4 h-4" />
                    {formatDistanceToNow(new Date(selectedRequest.created_at))} ago
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
                  label={tm("shares_wanted")}
                  value={<ShareBoxes count={selectedRequest.shares_wanted} />}
                />
                <InfoItem
                  label={tm("budget")}
                  value={selectedRequest.budget ? `৳${selectedRequest.budget.toLocaleString()}` : tm("not_specified")}
                />
                <InfoItem
                  label={tm("cow_price")}
                  value={selectedRequest.cow_price_min ? `৳${selectedRequest.cow_price_min.toLocaleString()} - ৳${selectedRequest.cow_price_max.toLocaleString()}` : tm("not_specified")}
                />
                <InfoItem
                  label={tm("posted")}
                  value={`${formatDistanceToNow(new Date(selectedRequest.created_at))} ago`}
                />
                <InfoItem
                  label={locale === "en" ? "Availability" : "উপলব্ধতা"}
                  value={
                    (() => {
                      const ownerShares = selectedRequest.shares_wanted || 0;
                      const filledShares = selectedRequest.shares_filled || 0;
                      const remaining = Math.max(0, 7 - ownerShares - filledShares);
                      return (
                        <div className="flex flex-col gap-1">
                          <span className="text-primary font-bold">{remaining} {locale === "en" ? "shares left" : "ভাগ বাকি"}</span>
                          <div className="flex gap-1">
                            {Array.from({ length: 7 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-2.5 h-2.5 rounded-sm ${
                                  i < ownerShares
                                    ? "bg-amber-500"  // poster's own shares
                                    : i < ownerShares + filledShares
                                    ? "bg-primary"    // member shares
                                    : "bg-border/50"  // available
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()
                  }
                />
              </div>

              {/* Member List Section */}
              <div className="mb-6">
                <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-3">
                  {locale === "en" ? "Current Members" : "বর্তমান সদস্য"}
                </p>
                <div className="flex flex-col gap-2">
                  {/* Show approved members */}
                  {selectedRequest.members?.map((member: any) => (
                    <div key={member.user_id} className="flex items-center justify-between bg-background rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {member.full_name?.[0] || "?"}
                        </div>
                        <span className="text-sm text-text-primary">
                          {member.full_name || (locale === "en" ? "Anonymous" : "পরিচয় গোপন")}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                        {member.shares_taken} {locale === "en" ? "shares" : "ভাগ"}
                      </span>
                    </div>
                  ))}
                  {/* Remaining capacity */}
                  <div className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2 border border-dashed border-amber-200">
                    <span className="text-sm text-amber-700 font-medium">
                      {locale === "en" ? "Available" : "খালি আছে"}
                    </span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">
                      {Math.max(0, 7 - (selectedRequest.shares_wanted || 0) - (selectedRequest.shares_filled || 0))} {locale === "en" ? "shares" : "ভাগ"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {(() => {
                const hasPhone = !!(selectedRequest.whatsapp_number || selectedRequest.phone_number) && !selectedRequest.hide_phone;
                const isOwnListing = selectedRequest.user_id === profile?.id;
                const sharesRemaining = Math.max(0, 7 - (selectedRequest.shares_wanted || 0) - (selectedRequest.shares_filled || 0));
                const userMembership = membership;

                return (
                  <div className="flex flex-col gap-3 mb-6">

                    {/* Join / Status Button */}
                    {!isOwnListing && (
                      <div className="mb-2">
                        {userMembership ? (
                          <div className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm border-2 ${userMembership.status === "approved"
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-amber-50 border-amber-200 text-amber-700"
                            }`}>
                            {userMembership.status === "approved" ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            {userMembership.status === "approved"
                              ? (locale === "en" ? "Joined Group" : "গ্রুপে যুক্ত আছেন")
                              : (locale === "en" ? "Join request pending approval..." : "অনুমোদনের অপেক্ষায়...")}
                          </div>
                        ) : sharesRemaining > 0 ? (
                          <button
                            onClick={() => setShowJoinModal(true)}
                            className="w-full py-4 rounded-2xl bg-accent text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent/20 active:scale-95 transition-all text-sm"
                          >
                            <UsersIcon className="w-5 h-5 flex-shrink-0" />
                            {locale === "en"
                              ? `Join — ${sharesRemaining} shares left`
                              : `যোগ দিন — ${sharesRemaining} ভাগ বাকি`}
                          </button>
                        ) : null}
                      </div>
                    )}

                    {/* WhatsApp + Call */}
                    {hasPhone && (
                      <div className="grid grid-cols-2 gap-3">
                        <a
                          href={`https://wa.me/88${selectedRequest.whatsapp_number || selectedRequest.phone_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-primary text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all text-sm"
                        >
                          <MessageSquare className="w-5 h-5 flex-shrink-0" />
                          {tm("whatsapp")}
                        </a>
                        <a
                          href={`tel:${selectedRequest.phone_number || selectedRequest.whatsapp_number}`}
                          className="border-2 border-accent text-accent py-4 rounded-2xl flex items-center justify-center gap-2 font-bold active:scale-95 transition-all text-sm"
                        >
                          <Phone className="w-5 h-5 flex-shrink-0" />
                          {tm("call")}
                        </a>
                      </div>
                    )}

                    {/* Message button */}
                    {!isOwnListing && !userMembership && (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
                            {locale === "en" ? "or" : "অথবা"}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <button
                          onClick={() => router.push(`/messages/${selectedRequest.id}/${selectedRequest.user_id}`)}
                          className="w-full py-4 rounded-2xl border-2 border-primary/30 text-primary bg-primary/5 font-bold active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-5 h-5 flex-shrink-0" />
                          {tm("send_message")}
                        </button>
                      </>
                    )}

                    {/* Own listing indicator */}
                    {isOwnListing && (
                      <div className="w-full py-3 rounded-2xl bg-background border border-dashed border-border flex items-center justify-center gap-2 text-text-muted text-sm">
                        <UsersIcon className="w-4 h-4 flex-shrink-0" />
                        {locale === "en" ? "This is your listing" : "এটি আপনার পোস্ট"}
                      </div>
                    )}

                  </div>
                );
              })()}

              <button className="w-full text-text-muted text-xs flex items-center justify-center gap-1 hover:text-error transition-colors">
                <AlertCircle className="w-3 h-3" /> {tm("report")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && selectedRequest && (
        <div className="fixed inset-0 z-[10000] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowJoinModal(false)} />
          <div className="relative w-full bg-white rounded-t-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold text-text-primary mb-2 text-center">
              {locale === "en" ? "How many shares do you want?" : "আপনি কতটি ভাগ নিতে চান?"}
            </h3>
            <p className="text-sm text-text-muted mb-8 text-center">
              {locale === "en"
                ? `Maximum ${Math.max(0, 7 - (selectedRequest.shares_wanted || 0) - (selectedRequest.shares_filled || 0))} shares available`
                : `সর্বোচ্চ ${Math.max(0, 7 - (selectedRequest.shares_wanted || 0) - (selectedRequest.shares_filled || 0))} ভাগ নেওয়া যাবে`}
            </p>

            <div className="flex gap-2 mb-10 justify-center">
              {Array.from({ length: 7 }).map((_, i) => {
                const sharesRemaining = Math.max(0, 7 - (selectedRequest.shares_wanted || 0) - (selectedRequest.shares_filled || 0));
                const isAvailable = i < sharesRemaining;
                const isSelected = i < joinSharesCount;
                return (
                  <button
                    key={i}
                    disabled={!isAvailable}
                    onClick={() => isAvailable && setJoinSharesCount(i + 1)}
                    className={`w-11 h-11 rounded-xl font-bold text-sm transition-all ${isSelected
                      ? "bg-accent text-white shadow-lg scale-110"
                      : isAvailable
                        ? "bg-background text-text-muted border-2 border-border hover:border-accent"
                        : "bg-border/20 text-border cursor-not-allowed"
                      }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 py-4 rounded-2xl border-2 border-border text-text-muted font-bold active:scale-95 transition-all"
              >
                {locale === "en" ? "Cancel" : "বাতিল"}
              </button>
              <button
                onClick={handleJoinRequest}
                disabled={joinSharesCount === 0 || joiningLoading}
                className="flex-[2] py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center"
              >
                {joiningLoading
                  ? <LoadingSpinner size={20} />
                  : locale === "en" ? "Send Request" : "অনুরোধ পাঠান"}
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
      className={`flex flex-col items-center gap-1 transition-colors ${active ? "text-primary" : "text-text-muted hover:text-primary"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-primary/10" : ""}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </button>
  );
}

function RequestCard({ request, onClick }: any) {
  const router = useRouter();
  const tm = useTranslations("map_page");

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
        <p className="text-xs text-text-muted mb-1">{tm("shares_wanted")}</p>
        <ShareBoxes count={request.shares_wanted} mini />
      </div>
      <div className="flex items-center justify-between mt-4">
        <div>
          <p className="text-[10px] text-text-muted uppercase">{tm("budget")}</p>
          <p className="text-sm font-bold text-text-primary">
            {request.budget ? `৳${request.budget.toLocaleString()}` : "--"}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (request.hide_phone) {
              router.push(`/messages/${request.id}/${request.user_id}`);
            } else {
              window.open(`https://wa.me/88${request.whatsapp_number || request.phone_number}`, "_blank");
            }
          }}
          className="bg-primary text-white p-2 rounded-xl"
        >
          {request.hide_phone ? <MessageCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
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
          className={`rounded-sm ${mini ? "w-2.5 h-2.5" : "w-4 h-4"} ${i < count ? "bg-primary shadow-sm" : "bg-border/50"
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
