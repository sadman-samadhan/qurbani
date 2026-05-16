"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell, Map as MapIcon, ClipboardList, MessageCircle, User,
  Plus, Search, Phone, MessageSquare, AlertCircle, MapPin,
  Clock, Users as UsersIcon, X, Globe, UserPlus, CheckCircle2,
  ChevronRight, AlertTriangle, ChevronDown, Navigation
} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import Image from "next/image";
import Logo from "@/components/ui/Logo";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import OnboardingTour, { TourStep } from "@/components/ui/OnboardingTour";
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

const tourSteps: TourStep[] = [
  { isIntro: true, titleKey: "intro_title" },
  { targetSelector: '[data-tour="map"]', titleKey: "step1_title", descKey: "step1_desc" },
  { targetSelector: '[data-tour="nearby-listings"]', titleKey: "step2_title", descKey: "step2_desc" },
  { targetSelector: '[data-tour="fab-post"], [data-tour="fab-post-desktop"]', titleKey: "step3_title", descKey: "step3_desc" },
  { targetSelector: '[data-tour="first-listing-card"]', titleKey: "step4_title", descKey: "step4_desc" },
  { targetSelector: '[data-tour="messages-tab"]', titleKey: "step5_title", descKey: "step5_desc" },
  { targetSelector: '[data-tour="map-tab"]', titleKey: "nav_map_title", descKey: "nav_map_desc" },
  { targetSelector: '[data-tour="my-posts-tab"]', titleKey: "nav_posts_title", descKey: "nav_posts_desc" },
  { targetSelector: '[data-tour="profile-tab"]', titleKey: "nav_profile_title", descKey: "nav_profile_desc" },
  { targetSelector: '[data-tour="join-section"]', titleKey: "step6_title", descKey: "step6_desc" },
];

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
  const [myJoinRequest, setMyJoinRequest] = useState<{ id: string; status: string; approved_at?: string; shares_wanted?: number } | null>(null);
  const [withdrawConfirm, setWithdrawConfirm] = useState<{ id: string; status: string; approvedAt?: string; sharesWanted?: number } | null>(null);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [joinStatusLoading, setJoinStatusLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinSharesWanted, setJoinSharesWanted] = useState(1);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [approveConfirm, setApproveConfirm] = useState<any | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [showTour, setShowTour] = useState(false);

  const otherRequests = useMemo(() => {
    if (!profile) return [];
    const nearbyIds = new Set(nearbyRequests.map((r: any) => r.id));
    return allRequests.filter(
      (r: any) => r.user_id !== profile.id && !nearbyIds.has(r.id)
    );
  }, [allRequests, nearbyRequests, profile]);

  const groupedOtherRequests = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const r of otherRequests) {
      const area = r.area_name?.split(",")[0]?.trim() || (locale === "en" ? "Unknown" : "অজানা");
      if (!groups[area]) groups[area] = [];
      groups[area].push(r);
    }
    return Object.entries(groups).sort(([, a], [, b]) => b.length - a.length);
  }, [otherRequests, locale]);

  const toggleArea = (area: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const handleLangToggle = async () => {
    const next = locale === "en" ? "bn" : "en";
    await setLocale(next);
    router.refresh();
  };

  const handleTourDone = () => {
    localStorage.setItem("qs_tour_done", "1");
    setShowTour(false);
  };

  const fetchMyJoinStatus = async (requestId: string) => {
    if (!profile) return;
    setJoinStatusLoading(true);
    const { data } = await supabase
      .from("join_requests")
      .select("id, status, approved_at, shares_wanted")
      .eq("request_id", requestId)
      .eq("requester_id", profile.id)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    setMyJoinRequest(data || null);
    setJoinStatusLoading(false);
  };

  const handleJoinSubmit = async () => {
    if (!profile || !selectedRequest) return;
    setJoinSubmitting(true);
    try {
      const { error } = await supabase.from("join_requests").insert({
        request_id: selectedRequest.id,
        requester_id: profile.id,
        shares_wanted: joinSharesWanted,
      });
      if (error) {
        console.error("[join_requests insert error]", error);
        if (error.message?.includes("max_pending_requests_reached")) {
          toast.error(locale === "en"
            ? "You have 5 active requests. Withdraw one before sending another."
            : "আপনার সর্বোচ্চ ৫টি সক্রিয় অনুরোধ আছে। একটি প্রত্যাহার করুন তারপর আবার চেষ্টা করুন।");
        } else if (error.message?.includes("duplicate key") || error.code === "23505") {
          toast.error(locale === "en" ? "You already sent a request for this listing." : "আপনি ইতিমধ্যে এই পোস্টে অনুরোধ পাঠিয়েছেন।");
        } else {
          toast.error(locale === "en" ? "Something went wrong. Try again." : "সমস্যা হয়েছে। আবার চেষ্টা করুন।");
        }
        return;
      }
      await supabase.from("messages").insert({
        sender_id: profile.id,
        receiver_id: selectedRequest.user_id,
        request_id: selectedRequest.id,
        content: locale === "en"
          ? `As-salamu alaykum, I'd like to join with ${joinSharesWanted} share(s).`
          : `আস-সালামু আলাইকুম, আমি ${joinSharesWanted}টি শেয়ারে যোগ দিতে চাই।`,
      });
      toast.success(locale === "en" ? "Request sent! Opening chat…" : "অনুরোধ পাঠানো হয়েছে! চ্যাট খুলছে…");
      setShowJoinModal(false);
      router.push(`/messages/${selectedRequest.id}/${selectedRequest.user_id}`);
    } catch {
      toast.error(locale === "en" ? "Something went wrong." : "সমস্যা হয়েছে।");
    } finally {
      setJoinSubmitting(false);
    }
  };

  // ── Notifications ──────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("notifications")
      .select(`
        id, type, read, created_at,
        join_requests (
          id, shares_wanted, request_id,
          share_requests:request_id ( area_name ),
          requester:requester_id ( full_name )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications(data || []);
    setNotifCount((data || []).filter((n: any) => !n.read).length);
  }, []);

  const markAllNotificationsRead = async (userId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    setNotifCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const fetchPendingJoinRequests = async (userId: string) => {
    setPendingLoading(true);
    const { data: ownPosts } = await supabase
      .from("share_requests")
      .select("id, area_name, shares_wanted")
      .eq("user_id", userId)
      .eq("status", "open");

    if (!ownPosts || ownPosts.length === 0) {
      setPendingJoinRequests([]);
      setPendingLoading(false);
      return;
    }

    const postIds = ownPosts.map((p: any) => p.id);
    const { data: joinReqs } = await supabase
      .from("join_requests")
      .select("id, request_id, requester_id, shares_wanted, created_at, status")
      .in("request_id", postIds)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (!joinReqs || joinReqs.length === 0) {
      setPendingJoinRequests([]);
      setPendingLoading(false);
      return;
    }

    const requesterIds = [...new Set(joinReqs.map((r: any) => r.requester_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, penalty_count")
      .in("id", requesterIds);

    const enriched = joinReqs.map((jr: any) => ({
      ...jr,
      post: ownPosts.find((p: any) => p.id === jr.request_id),
      requester: profiles?.find((p: any) => p.id === jr.requester_id),
    }));

    setPendingJoinRequests(enriched);
    setPendingLoading(false);
  };

  const handleApprove = async () => {
    if (!approveConfirm || !profile) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("join_requests")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", approveConfirm.id);
      if (error) throw error;

      const phone = profile.phone_number || profile.whatsapp_number || "";
      const msgContent = locale === "en"
        ? `✅ Request approved. Contact: ${phone}`
        : `✅ আপনার অনুরোধ অনুমোদিত হয়েছে। যোগাযোগ: ${phone}`;

      // DB trigger auto_notify_on_join_event handles the notification insert.
      // We only need to send the system message here.
      await supabase.from("messages").insert({
        sender_id: profile.id,
        receiver_id: approveConfirm.requester_id,
        request_id: approveConfirm.request_id,
        content: msgContent,
        is_system_message: true,
      });

      toast.success(locale === "en" ? "Request approved!" : "অনুরোধ অনুমোদিত হয়েছে!");
      setApproveConfirm(null);
      fetchPendingJoinRequests(profile.id);
    } catch {
      toast.error(locale === "en" ? "Something went wrong." : "সমস্যা হয়েছে।");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectConfirm || !profile) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("join_requests")
        .update({ status: "rejected" })
        .eq("id", rejectConfirm.id);
      if (error) throw error;

      const msgContent = locale === "en"
        ? "Your request could not be accepted. Thank you."
        : "আপনার অনুরোধ গ্রহণ করা সম্ভব হয়নি। ধন্যবাদ।";

      // DB trigger auto_notify_on_join_event handles the notification insert.
      // We only need to send the system message here.
      await supabase.from("messages").insert({
        sender_id: profile.id,
        receiver_id: rejectConfirm.requester_id,
        request_id: rejectConfirm.request_id,
        content: msgContent,
        is_system_message: true,
      });

      toast.success(locale === "en" ? "Request rejected." : "অনুরোধ প্রত্যাখ্যান করা হয়েছে।");
      setRejectConfirm(null);
      fetchPendingJoinRequests(profile.id);
    } catch {
      toast.error(locale === "en" ? "Something went wrong." : "সমস্যা হয়েছে।");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Phase 6: Withdrawal
  const handleWithdraw = async () => {
    if (!withdrawConfirm || !profile) return;
    setWithdrawSubmitting(true);
    try {
      const willIncurPenalty =
        withdrawConfirm.status === "approved" &&
        withdrawConfirm.approvedAt != null &&
        Date.now() - new Date(withdrawConfirm.approvedAt).getTime() > 24 * 60 * 60 * 1000;

      const { error } = await supabase
        .from("join_requests")
        .update({ status: "withdrawn" })
        .eq("id", withdrawConfirm.id);
      if (error) throw error;

      if (willIncurPenalty) {
        const newCount = (profile.penalty_count || 0) + 1;
        const updates: any = { penalty_count: newCount };
        if (newCount >= 5) updates.is_banned = true;
        await supabase.from("profiles").update(updates).eq("id", profile.id);
        setProfile((prev: any) => ({ ...prev, ...updates }));
        if (updates.is_banned) {
          toast.error(locale === "en"
            ? "Your account has been suspended after 5 penalties."
            : "৫টি পেনাল্টির পর আপনার অ্যাকাউন্ট স্থগিত হয়েছে।");
        }
      }

      toast.success(locale === "en" ? "Request withdrawn." : "অনুরোধ প্রত্যাহার করা হয়েছে।");
      setWithdrawConfirm(null);
      setMyJoinRequest(null);
    } catch {
      toast.error(locale === "en" ? "Something went wrong." : "সমস্যা হয়েছে।");
    } finally {
      setWithdrawSubmitting(false);
    }
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

      if (localStorage.getItem("qs_tour_pending") === "1") {
        localStorage.removeItem("qs_tour_pending");
        setShowTour(true);
      }

      fetchNearby(profile.latitude, profile.longitude, user.id);
      fetchPendingJoinRequests(user.id);
      fetchNotifications(user.id);

      // Fetch initial unread message count
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
      const [nearbyRes, allRes] = await Promise.all([
        supabase.rpc("get_nearby_requests", {
          user_lat: lat,
          user_lng: lng,
          radius_km: 2
        }),
        supabase
          .from("share_requests")
          .select("*, profiles(full_name)")
          .eq("status", "open")
      ]);

      if (nearbyRes.error) throw nearbyRes.error;
      if (allRes.error) throw allRes.error;

      // Flatten allRes data to have full_name at top level
      const enrichedAll = (allRes.data || []).map((req: any) => ({
        ...req,
        full_name: req.profiles?.full_name
      }));

      const filteredNearby = (nearbyRes.data || []).filter((req: any) => req.user_id !== userId);

      setNearbyRequests(filteredNearby);
      setAllRequests(enrichedAll);
    } catch (err: any) {
      console.error("Fetch error:", err);
      toast.error("অনুরোধগুলো আনতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
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

  // 5. Realtime Subscription — notifications (Phase 5)
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel("notifications_realtime")
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchNotifications(profile.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchNotifications]);

  const handleCardClick = (req: any) => {
    setSelectedRequest(req);
    setMapCenter([req.latitude, req.longitude]);
    setMyJoinRequest(null);
    setShowJoinModal(false);
    setJoinSharesWanted(1);
    if (req.is_joinable && req.user_id !== profile?.id) {
      fetchMyJoinStatus(req.id);
    }
  };

  return (
    <div className="flex flex-col h-screen lg:h-auto lg:min-h-screen bg-background font-hind relative overflow-hidden lg:overflow-visible">
      {/* Top Bar — mobile: minimal | desktop: full nav */}
      <div className="bg-white px-4 lg:px-6 py-3 flex items-center justify-between border-b border-border z-10">
        <Logo width={32} height={32} />

        <div className="flex items-center gap-3">
          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button className="flex items-center gap-2 px-4 py-2 text-primary font-bold text-sm rounded-xl bg-primary/10">
              <MapIcon className="w-4 h-4" /> {td("map")}
            </button>
            <button
              onClick={() => router.push("/my-requests")}
              className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-primary hover:bg-primary/5 text-sm font-medium rounded-xl transition-colors"
            >
              <ClipboardList className="w-4 h-4" /> {td("my_posts")}
            </button>
            <div className="relative">
              <button
                onClick={() => router.push("/messages")}
                className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-primary hover:bg-primary/5 text-sm font-medium rounded-xl transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> {td("messages")}
              </button>
              {unreadCount > 0 && (
                <span className="absolute -top-1 right-0 bg-error text-[8px] text-white px-1.5 py-0.5 rounded-full font-bold min-w-[16px] text-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-primary hover:bg-primary/5 text-sm font-medium rounded-xl transition-colors"
            >
              <User className="w-4 h-4" /> {td("profile")}
            </button>
            {/* Desktop bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifPanelOpen(true);
                  if (notifCount > 0 && profile) markAllNotificationsRead(profile.id);
                }}
                className="flex items-center gap-2 px-3 py-2 text-text-muted hover:text-primary hover:bg-primary/5 text-sm font-medium rounded-xl transition-colors"
              >
                <Bell className="w-4 h-4" />
              </button>
              {notifCount > 0 && (
                <span className="absolute -top-1 right-0 bg-error text-[8px] text-white px-1.5 py-0.5 rounded-full font-bold min-w-[16px] text-center">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </div>
            <button
              data-tour="fab-post-desktop"
              onClick={() => router.push("/post-request")}
              className="ml-2 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-light active:scale-95 transition-all shadow-sm shadow-primary/20"
            >
              <Plus className="w-4 h-4" /> {td("post_new")}
            </button>
          </nav>

          <button
            onClick={handleLangToggle}
            className="flex items-center gap-1 text-sm font-bold text-text-muted hover:text-primary"
          >
            <Globe className="w-4 h-4" />
            {locale === "en" ? "বাংলা" : "EN"}
          </button>
          {/* Bell notification icon — mobile only */}
          <div className="relative lg:hidden">
            <button
              onClick={() => {
                setNotifPanelOpen(true);
                if (notifCount > 0 && profile) markAllNotificationsRead(profile.id);
              }}
              className="relative p-1 rounded-xl hover:bg-primary/5 active:scale-95 transition-all"
            >
              <Bell className="w-6 h-6 text-text-muted" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-[8px] text-white px-1.5 py-0.5 rounded-full font-bold min-w-[16px] text-center">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>
          </div>
          {/* Desktop profile avatar */}
          {profile && (
            <button
              onClick={() => router.push("/profile")}
              className="hidden lg:flex w-9 h-9 bg-primary/10 rounded-full items-center justify-center border-2 border-primary/20 hover:border-primary/40 transition-colors"
            >
              <span className="text-sm font-bold text-primary">
                {profile.full_name?.[0] || "?"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Phase 6b: Ban Banner ─────────────────────────────────────────── */}
      {profile?.is_banned && (
        <div className="px-4 lg:px-6 pt-3">
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⛔</span>
            <div>
              <p className="font-bold text-red-700 text-sm">
                {locale === "en" ? "Your account has been suspended." : "আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে।"}
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {locale === "en"
                  ? "You have received 5 penalties and cannot send new join requests. Please contact support."
                  : "৫টি পেনাল্টি অর্জন করায় আপনি নতুন শেয়ার অনুরোধ করতে পারবেন না। সহায়তার জন্য যোগাযোগ করুন।"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Join Requests — owner management */}
      {(pendingLoading || pendingJoinRequests.length > 0) && (
        <div data-tour="join-section" className="px-4 lg:px-6 pt-4 lg:pt-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-text-primary">
                {locale === "en" ? "Join Requests" : "যোগ দেওয়ার অনুরোধ"}
              </h2>
              {!pendingLoading && (
                <p className="text-[10px] text-text-muted">
                  {pendingJoinRequests.length} {locale === "en" ? "pending" : "অপেক্ষায়"}
                </p>
              )}
            </div>
            {!pendingLoading && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                {pendingJoinRequests.length}
              </span>
            )}
          </div>
          {pendingLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {[1, 2].map(i => (
                <div key={i} className="flex-shrink-0 w-72 bg-white border border-border rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-0.5 bg-border" />
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 bg-background rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="w-28 h-3.5 bg-background rounded-lg" />
                        <div className="w-20 h-3 bg-background rounded-lg" />
                      </div>
                    </div>
                    <div className="h-14 bg-background rounded-xl mb-4" />
                    <div className="flex gap-2">
                      <div className="flex-1 h-9 bg-background rounded-xl" />
                      <div className="flex-1 h-9 bg-background rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar lg:grid lg:grid-cols-3 lg:overflow-visible">
              {pendingJoinRequests.map((jr) => (
                <div key={jr.id} className="flex-shrink-0 w-72 lg:w-auto bg-white rounded-2xl overflow-hidden shadow-sm border border-border/60">
                  <div className="h-0.5 bg-amber-400" />
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-100 to-orange-50 border-2 border-amber-200">
                        <span className="text-sm font-bold text-amber-700">
                          {jr.requester?.full_name?.[0] || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-primary text-sm truncate">
                          {jr.requester?.full_name || (locale === "en" ? "Unknown" : "অজানা")}
                        </p>
                        {(jr.requester?.penalty_count ?? 0) > 0 ? (
                          <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            {jr.requester.penalty_count} {locale === "en" ? "penalty(ies)" : "পেনাল্টি"}
                          </p>
                        ) : (
                          <p className="text-[10px] text-green-600 font-medium mt-0.5">
                            {locale === "en" ? "✓ No penalties" : "✓ কোনো পেনাল্টি নেই"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="bg-amber-50/70 rounded-xl px-3 py-2.5 mb-4 border border-amber-100">
                      <p className="text-[10px] text-text-muted mb-0.5">
                        {locale === "en" ? "Post" : "পোস্ট"}: <span className="font-semibold text-text-secondary">{jr.post?.area_name?.split(",")[0] || "—"}</span>
                      </p>
                      <p className="text-sm font-bold text-text-primary">
                        {locale === "en"
                          ? `${jr.shares_wanted} share${jr.shares_wanted !== 1 ? "s" : ""} wanted`
                          : `${jr.shares_wanted}টি শেয়ার চাওয়া হয়েছে`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRejectConfirm(jr)}
                        className="flex-1 py-2.5 border border-error/40 text-error rounded-xl text-xs font-bold hover:bg-error/5 active:scale-95 transition-all"
                      >
                        {locale === "en" ? "Reject" : "প্রত্যাখ্যান"}
                      </button>
                      <button
                        onClick={() => setApproveConfirm(jr)}
                        className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-light active:scale-95 transition-all shadow-sm shadow-primary/20"
                      >
                        {locale === "en" ? "Approve" : "অনুমোদন"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Section — fixed height, no shrink */}
      <div data-tour="map" className="relative h-[45vh] sm:h-[50vh] min-h-[260px] lg:h-[60vh] flex-shrink-0">
        {profile && mapCenter && (
          <DashboardMap
            center={mapCenter}
            userPos={[profile.latitude, profile.longitude]}
            requests={allRequests}
            onMarkerClick={(req) => {
              handleCardClick(req);
            }}
          />
        )}
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-[1000]">
            <LoadingSpinner />
          </div>
        )}
      </div>

      {/* Scrollable content below map */}
      <div className="flex-1 overflow-y-auto lg:overflow-visible">

      {/* Nearby Listings */}
      <div data-tour="nearby-listings" className="p-4 lg:px-6 lg:py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Image src="/images/cow.png" alt="" width={18} height={18} className="object-contain" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">{td("nearby")}</h2>
              {!loading && (
                <p className="text-[10px] text-text-muted">
                  {nearbyRequests.length} {locale === "en" ? "found nearby" : "কাছে পাওয়া গেছে"}
                </p>
              )}
            </div>
          </div>
          {!loading && nearbyRequests.length > 0 && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/15">
              {nearbyRequests.length}
            </span>
          )}
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar lg:hidden">
          {loading ? (
            [1, 2, 3].map(i => <SkeletonCard key={i} />)
          ) : nearbyRequests.length > 0 ? (
            nearbyRequests.map((req, i) => (
              <RequestCard key={req.id} request={req} onClick={() => handleCardClick(req)} {...(i === 0 ? { "data-tour": "first-listing-card" } : {})} />
            ))
          ) : (
            <div className="w-full py-8 text-center bg-white rounded-2xl border border-dashed border-border">
              <span className="text-4xl mb-2 block">🐄</span>
              <p className="text-text-muted">{td("no_requests")}</p>
            </div>
          )}
        </div>

        {/* Desktop: 4-column grid */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-4">
          {loading ? (
            [1, 2, 3, 4].map(i => <SkeletonCard key={i} className="" />)
          ) : nearbyRequests.length > 0 ? (
            nearbyRequests.map((req, i) => (
              <RequestCard key={req.id} request={req} className="" onClick={() => handleCardClick(req)} {...(i === 0 ? { "data-tour": "first-listing-card" } : {})} />
            ))
          ) : (
            <div className="col-span-4 py-8 text-center bg-white rounded-2xl border border-dashed border-border">
              <span className="text-4xl mb-2 block">🐄</span>
              <p className="text-text-muted">{td("no_requests")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Explore Other Areas */}
      {!loading && groupedOtherRequests.length > 0 && (
        <div className="px-4 lg:px-6 pb-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Navigation className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                {locale === "en" ? "Explore Other Areas" : "অন্য এলাকা দেখুন"}
              </h2>
              <p className="text-[10px] text-text-muted">
                {otherRequests.length} {locale === "en" ? "requests in other areas" : "টি অনুরোধ অন্য এলাকায়"}
              </p>
            </div>
          </div>

          {groupedOtherRequests.map(([area, requests]) => {
            const isExpanded = expandedAreas.has(area);
            const visible = isExpanded ? requests : requests.slice(0, 5);
            return (
              <div key={area} className="bg-white rounded-2xl border border-border/60 overflow-x-hidden">
                {/* Area header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span className="text-sm font-bold text-text-primary">{area}</span>
                    <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                      {requests.length}
                    </span>
                  </div>
                </div>

                {/* Cards — mobile horizontal scroll, desktop grid */}
                <div className="p-3">
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar lg:hidden" style={{ WebkitOverflowScrolling: "touch" }}>
                    {visible.map(req => (
                      <RequestCard key={req.id} request={req} onClick={() => handleCardClick(req)} />
                    ))}
                  </div>
                  <div className="hidden lg:grid lg:grid-cols-4 gap-3">
                    {visible.map(req => (
                      <RequestCard key={req.id} request={req} className="" onClick={() => handleCardClick(req)} />
                    ))}
                  </div>

                  {requests.length > 5 && (
                    <button
                      onClick={() => toggleArea(area)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-accent hover:text-accent/80 py-2 border border-accent/20 rounded-xl hover:bg-accent/5 active:scale-95 transition-all"
                    >
                      {isExpanded
                        ? (locale === "en" ? "Show less" : "কম দেখুন")
                        : (locale === "en" ? `See all ${requests.length}` : `সব ${requests.length}টি দেখুন`)}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div>{/* end scrollable content */}

      {/* FAB — mobile only */}
      <div className="absolute bottom-24 right-4 z-20 lg:hidden">
        <button
          data-tour="fab-post"
          onClick={() => router.push("/post-request")}
          className="group relative bg-primary text-white w-16 h-16 rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-8 h-8" />
          <span className="absolute right-full mr-3 bg-white text-primary text-xs font-bold px-3 py-2 rounded-lg shadow-md border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {td("post_new")}
          </span>
        </button>
      </div>

      {/* Bottom Nav — mobile only */}
      <div className="bg-white border-t border-border flex-shrink-0 flex items-center justify-around pt-4 px-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] z-10 lg:hidden">
        <div data-tour="map-tab">
          <NavButton icon={<MapIcon className="w-6 h-6" />} label={td("map")} active />
        </div>
        <div data-tour="my-posts-tab">
          <NavButton icon={<ClipboardList className="w-6 h-6" />} label={td("my_posts")} onClick={() => router.push("/my-requests")} />
        </div>
        <div data-tour="messages-tab" className="relative group">
          <NavButton icon={<MessageCircle className="w-6 h-6" />} label={td("messages")} onClick={() => router.push("/messages")} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-error text-[8px] text-white px-1.5 py-0.5 rounded-full font-bold min-w-[16px] text-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <div data-tour="profile-tab">
          <NavButton icon={<User className="w-6 h-6" />} label={td("profile")} onClick={() => router.push("/profile")} />
        </div>
      </div>

      {/* Approve Confirm Dialog */}
      {approveConfirm && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">
              {locale === "en" ? "Approve Request?" : "অনুরোধ অনুমোদন করবেন?"}
            </h3>
            <p className="text-sm text-text-muted text-center mb-6">
              {locale === "en"
                ? `Give ${approveConfirm.shares_wanted} share(s) to ${approveConfirm.requester?.full_name}? Phone numbers will be shared.`
                : `${approveConfirm.requester?.full_name}-কে ${approveConfirm.shares_wanted}টি শেয়ার দেবেন? অনুমোদনের পরে ফোন নম্বর শেয়ার হবে।`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setApproveConfirm(null)}
                className="flex-1 py-3 border-2 border-border rounded-xl font-bold text-text-muted hover:bg-background transition-all active:scale-95"
              >
                {locale === "en" ? "Cancel" : "বাতিল"}
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-60"
              >
                {actionLoading ? "…" : (locale === "en" ? "Approve" : "অনুমোদন করুন")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirm Dialog */}
      {rejectConfirm && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-7 h-7 text-error" />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">
              {locale === "en" ? "Reject Request?" : "অনুরোধ প্রত্যাখ্যান করবেন?"}
            </h3>
            <p className="text-sm text-text-muted text-center mb-6">
              {locale === "en"
                ? `Reject ${rejectConfirm.requester?.full_name}'s request for ${rejectConfirm.shares_wanted} share(s)?`
                : `${rejectConfirm.requester?.full_name}-এর ${rejectConfirm.shares_wanted}টি শেয়ারের অনুরোধ প্রত্যাখ্যান করবেন?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRejectConfirm(null)}
                className="flex-1 py-3 border-2 border-border rounded-xl font-bold text-text-muted hover:bg-background transition-all active:scale-95"
              >
                {locale === "en" ? "Cancel" : "বাতিল"}
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-error hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-60"
              >
                {actionLoading ? "…" : (locale === "en" ? "Reject" : "প্রত্যাখ্যান করুন")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 6a: Withdraw Confirm Dialog ─────────────────────────────── */}
      {withdrawConfirm && (() => {
        const willIncurPenalty =
          withdrawConfirm.status === "approved" &&
          withdrawConfirm.approvedAt != null &&
          Date.now() - new Date(withdrawConfirm.approvedAt).getTime() > 24 * 60 * 60 * 1000;
        const penaltyCount = (profile?.penalty_count || 0) + 1;

        return (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${willIncurPenalty ? "bg-amber-100" : "bg-background"}`}>
                <AlertTriangle className={`w-7 h-7 ${willIncurPenalty ? "text-amber-600" : "text-text-muted"}`} />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">
                {locale === "en" ? "Withdraw Request?" : "অনুরোধ প্রত্যাহার করবেন?"}
              </h3>
              <p className="text-sm text-text-muted text-center mb-4">
                {willIncurPenalty
                  ? (locale === "en"
                    ? `⚠️ Warning: 24H has passed. Withdrawing will add 1 penalty to your account. (${penaltyCount}/5)`
                    : `⚠️ সতর্কতা: ২৪ ঘণ্টা পার হয়েছে। প্রত্যাহার করলে আপনার অ্যাকাউন্টে ১টি পেনাল্টি যোগ হবে। (${penaltyCount}/৫)`)
                  : withdrawConfirm.status === "approved"
                    ? (locale === "en"
                      ? "Withdrawing within 24H of approval — no penalty."
                      : "অনুমোদনের ২৪ ঘণ্টার মধ্যে প্রত্যাহার করলে পেনাল্টি হবে না।")
                    : (locale === "en"
                      ? "Confirm withdrawal? No penalty will be applied."
                      : "নিশ্চিতভাবে প্রত্যাহার করবেন? কোনো পেনাল্টি হবে না।")}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setWithdrawConfirm(null)}
                  className="flex-1 py-3 border-2 border-border rounded-xl font-bold text-text-muted hover:bg-background transition-all active:scale-95"
                >
                  {locale === "en" ? "Cancel" : "বাতিল"}
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawSubmitting}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-error hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-60"
                >
                  {withdrawSubmitting ? "…" : (locale === "en" ? "Withdraw" : "প্রত্যাহার করুন")}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Join Modal */}
      {showJoinModal && selectedRequest && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-center mb-1">
              {locale === "en" ? "How many shares do you want?" : "আপনি কতটি শেয়ার নিতে চান?"}
            </h3>
            <p className="text-sm text-text-muted text-center mb-6">
              {locale === "en"
                ? `Up to ${Math.max(0, 7 - (selectedRequest.shares_filled ?? selectedRequest.shares_wanted))} shares available`
                : `সর্বোচ্চ ${Math.max(0, 7 - (selectedRequest.shares_filled ?? selectedRequest.shares_wanted))}টি শেয়ার নেওয়া যাবে`}
            </p>
            <div className="flex items-center justify-center gap-6 mb-8">
              <button
                onClick={() => setJoinSharesWanted(Math.max(1, joinSharesWanted - 1))}
                disabled={joinSharesWanted <= 1}
                className="w-12 h-12 rounded-full border-2 border-primary text-primary text-2xl font-bold flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
              >-</button>
              <span className="text-4xl font-bold text-primary w-12 text-center">{joinSharesWanted}</span>
              <button
                onClick={() => setJoinSharesWanted(Math.min(Math.max(0, 7 - (selectedRequest.shares_filled ?? selectedRequest.shares_wanted)), joinSharesWanted + 1))}
                disabled={joinSharesWanted >= Math.max(0, 7 - (selectedRequest.shares_filled ?? selectedRequest.shares_wanted))}
                className="w-12 h-12 rounded-full border-2 border-primary text-primary text-2xl font-bold flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
              >+</button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 py-3 border-2 border-border rounded-xl font-bold text-text-muted hover:bg-background transition-all active:scale-95"
              >
                {locale === "en" ? "Cancel" : "বাতিল"}
              </button>
              <button
                onClick={handleJoinSubmit}
                disabled={joinSubmitting}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-60"
              >
                {joinSubmitting ? "…" : (locale === "en" ? "Send Request" : "অনুরোধ পাঠান")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet Details */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={() => setSelectedRequest(null)} />
          <div className="absolute bottom-0 inset-x-0 lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-[512px] bg-white rounded-t-[2.5rem] shadow-2xl animate-in slide-in-from-bottom duration-300 pointer-events-auto max-h-[85vh] flex flex-col">
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto my-4 flex-shrink-0" />
            <div className="overflow-y-auto px-6 pt-2 pb-8">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20 flex-shrink-0">
                  <span className="text-lg font-bold text-primary">
                    {!selectedRequest.hide_name && selectedRequest.full_name ? selectedRequest.full_name[0] : "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-text-primary truncate">
                    {!selectedRequest.hide_name && selectedRequest.full_name ? selectedRequest.full_name : tm("anonymous")}
                  </h3>
                  <div className="flex items-center gap-1 text-text-muted text-xs mt-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{selectedRequest.area_name?.split(",")[0]}</span>
                  </div>
                  <div className="flex items-center gap-1 text-text-muted text-xs mt-0.5">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span>{formatDistanceToNow(new Date(selectedRequest.created_at))} ago</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 bg-background rounded-full flex-shrink-0"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <InfoItem
                  label={tm("shares_wanted")}
                  value={<ShareBoxes count={selectedRequest.shares_wanted} filled={selectedRequest.shares_filled ?? selectedRequest.shares_wanted} />}
                />
                <InfoItem
                  label={tm("budget")}
                  value={selectedRequest.budget ? `৳${selectedRequest.budget.toLocaleString()}` : tm("not_specified")}
                />
                <InfoItem
                  label={tm("cow_price")}
                  value={selectedRequest.cow_price_min ? `৳${selectedRequest.cow_price_min.toLocaleString()} - ৳${selectedRequest.cow_price_max.toLocaleString()}` : tm("not_specified")}
                />
              </div>

              {/* Action Buttons */}
              {(() => {
                const hasPhone = !!(selectedRequest.whatsapp_number || selectedRequest.phone_number) && !selectedRequest.hide_phone;
                const isOwnListing = selectedRequest.user_id === profile?.id;
                const sharesFilled = selectedRequest.shares_filled ?? selectedRequest.shares_wanted;
                const isFull = sharesFilled >= 7;

                if (!selectedRequest.is_joinable) {
                  return (
                    <div className="flex flex-col gap-3 mb-6">
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
                      {!isOwnListing && (
                        <>
                          {hasPhone && (
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
                                {locale === "en" ? "or" : "অথবা"}
                              </span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                          )}
                          <button
                            onClick={() => router.push(`/messages/${selectedRequest.id}/${selectedRequest.user_id}`)}
                            className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold active:scale-95 transition-all text-sm ${hasPhone
                              ? "border-2 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                              : "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02]"
                              }`}
                          >
                            <MessageCircle className="w-5 h-5 flex-shrink-0" />
                            {tm("send_message")}
                          </button>
                        </>
                      )}
                      {isOwnListing && (
                        <div className="w-full py-3 rounded-2xl bg-background border border-dashed border-border flex items-center justify-center gap-2 text-text-muted text-sm">
                          <UsersIcon className="w-4 h-4 flex-shrink-0" />
                          {locale === "en" ? "This is your listing" : "এটি আপনার পোস্ট"}
                        </div>
                      )}
                    </div>
                  );
                }

                // Joinable post
                return (
                  <div className="flex flex-col gap-3 mb-6">
                    <ShareProgress filled={sharesFilled} locale={locale} />

                    {isOwnListing ? (
                      <div className="w-full py-3 rounded-2xl bg-background border border-dashed border-border flex items-center justify-center gap-2 text-text-muted text-sm">
                        <UsersIcon className="w-4 h-4 flex-shrink-0" />
                        {locale === "en" ? "This is your listing" : "এটি আপনার পোস্ট"}
                      </div>
                    ) : (
                      <>
                        <ShareSystemExplainer locale={locale} />

                        {isFull && myJoinRequest?.status !== "approved" && (
                          <div className="w-full py-3 rounded-2xl bg-gray-50 border border-border flex items-center justify-center text-text-muted text-sm">
                            {locale === "en" ? "All shares for this cow are filled" : "এই গরুর সব শেয়ার পূর্ণ হয়ে গেছে"}
                          </div>
                        )}

                        {myJoinRequest?.status === "approved" && (
                          <>
                            <div className="w-full py-3 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center gap-2 text-green-700 text-sm font-bold">
                              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                              {locale === "en" ? "Approved" : "অনুমোদিত হয়েছে"}
                            </div>
                            <button
                              onClick={() => setWithdrawConfirm({
                                id: myJoinRequest.id,
                                status: "approved",
                                approvedAt: myJoinRequest.approved_at,
                                sharesWanted: myJoinRequest.shares_wanted,
                              })}
                              className="w-full py-2.5 rounded-2xl border border-border text-text-muted text-xs font-semibold hover:border-error hover:text-error hover:bg-red-50 active:scale-95 transition-all"
                            >
                              {locale === "en" ? "Withdraw" : "প্রত্যাহার করুন"}
                            </button>
                            {!!(selectedRequest.whatsapp_number || selectedRequest.phone_number) && (
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
                          </>
                        )}

                        {myJoinRequest?.status === "pending" && (
                          <div className="flex flex-col gap-2">
                            <div className="w-full py-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center gap-2 text-amber-700 text-sm font-bold">
                              <Clock className="w-4 h-4 flex-shrink-0" />
                              {locale === "en" ? "Request sent — awaiting approval" : "অনুরোধ পাঠানো হয়েছে — অপেক্ষায় আছে"}
                            </div>
                            <button
                              onClick={() => setWithdrawConfirm({
                                id: myJoinRequest.id,
                                status: "pending",
                                sharesWanted: myJoinRequest.shares_wanted,
                              })}
                              className="w-full py-2.5 rounded-2xl border border-border text-text-muted text-xs font-semibold hover:border-error hover:text-error hover:bg-red-50 active:scale-95 transition-all"
                            >
                              {locale === "en" ? "Withdraw Request" : "অনুরোধ প্রত্যাহার করুন"}
                            </button>
                          </div>
                        )}

                        {joinStatusLoading && (
                          <div className="w-full h-12 bg-background rounded-2xl animate-pulse" />
                        )}

                        {!myJoinRequest && !isFull && !joinStatusLoading && (
                          profile?.is_banned ? (
                            <div className="w-full py-3 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 text-sm text-center px-3">
                              {locale === "en" ? "Your account is suspended." : "আপনার অ্যাকাউন্ট স্থগিত আছে।"}
                            </div>
                          ) : (
                            <button
                              onClick={() => { setJoinSharesWanted(1); setShowJoinModal(true); }}
                              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm"
                            >
                              <UserPlus className="w-5 h-5 flex-shrink-0" />
                              {locale === "en" ? "Request to Join" : "যোগ দিতে চাই"}
                            </button>
                          )
                        )}

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
                            {locale === "en" ? "or chat first" : "বা আগে চ্যাট করুন"}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>

                        <button
                          onClick={() => router.push(`/messages/${selectedRequest.id}/${selectedRequest.user_id}`)}
                          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold border-2 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 active:scale-95 transition-all text-sm"
                        >
                          <MessageCircle className="w-5 h-5 flex-shrink-0" />
                          {tm("send_message")}
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}

              <button className="w-full text-text-muted text-xs flex items-center justify-center gap-1 hover:text-error active:scale-95 transition-all py-2">
                <AlertCircle className="w-3 h-3" /> {tm("report")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Panel (Phase 5) ──────────────────────────────────── */}
      {notifPanelOpen && (
        <div className="fixed inset-0 z-[10002] flex items-end lg:items-start lg:justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setNotifPanelOpen(false)}
          />
          {/* Panel */}
          <div className="relative w-full lg:w-96 lg:max-h-[85vh] lg:mt-14 lg:mr-4 bg-white rounded-t-[2.5rem] lg:rounded-2xl shadow-2xl animate-in slide-in-from-bottom lg:slide-in-from-top duration-300 flex flex-col max-h-[80vh]">
            {/* Handle (mobile) */}
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mt-4 flex-shrink-0 lg:hidden" />
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                {locale === "en" ? "Notifications" : "নোটিফিকেশন"}
              </h2>
              <button
                onClick={() => setNotifPanelOpen(false)}
                className="p-1.5 rounded-xl bg-background hover:bg-border/30 active:scale-95 transition-all"
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            {/* List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <span className="text-4xl mb-3">🔔</span>
                  <p className="text-text-muted text-sm">
                    {locale === "en" ? "No new notifications." : "কোনো নতুন নোটিফিকেশন নেই।"}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((notif: any) => (
                    <NotificationItem
                      key={notif.id}
                      notif={notif}
                      locale={locale}
                      onNavigate={(path: string) => {
                        setNotifPanelOpen(false);
                        router.push(path);
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {showTour && !loading && (
        <OnboardingTour
          steps={tourSteps}
          locale={locale}
          onDone={handleTourDone}
        />
      )}
    </div>
  );
}

// ── ShareSystemExplainer sub-component ────────────────────────────────────────
function ShareSystemExplainer({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("tour");

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-text-muted hover:bg-background transition-colors"
      >
        <span>{locale === "en" ? "How does sharing work?" : "শেয়ার কীভাবে কাজ করে?"}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 bg-background border-t border-border">
          <ol className="flex flex-col gap-2 pt-3">
            {(["intro_point1", "intro_point2", "intro_point3", "intro_point4", "intro_point5"] as const).map((key, i) => (
              <li key={key} className="flex gap-2 text-xs text-text-muted">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ── NotificationItem component (Phase 5) ─────────────────────────────────────
function NotificationItem({ notif, locale, onNavigate }: any) {
  const { formatDistanceToNow } = require("date-fns");
  const jr = notif.join_requests;
  const requesterName = jr?.requester?.full_name || (locale === "en" ? "Someone" : "কেউ");
  const areaName = jr?.share_requests?.area_name?.split(",")[0] || "";
  const requestId = jr?.request_id;

  let icon = "🔔";
  let text = "";
  let subtext = areaName;

  switch (notif.type) {
    case "join_request":
      icon = "👤";
      text = locale === "en"
        ? `${requesterName} wants to join your post`
        : `${requesterName} আপনার পোস্টে যোগ দিতে চান`;
      break;
    case "join_approved":
      icon = "✅";
      text = locale === "en"
        ? `Your join request was approved`
        : `আপনার অনুরোধ অনুমোদিত হয়েছে`;
      break;
    case "join_rejected":
      icon = "❌";
      text = locale === "en"
        ? `Your join request was not accepted`
        : `আপনার অনুরোধ গৃহীত হয়নি`;
      break;
    case "join_withdrawn":
      icon = "↩️";
      text = locale === "en"
        ? `${requesterName} withdrew their request`
        : `${requesterName} তাদের অনুরোধ প্রত্যাহার করেছেন`;
      break;
    default:
      text = locale === "en" ? "New notification" : "নতুন নোটিফিকেশন";
  }

  return (
    <li
      className={`flex items-start gap-3 px-5 py-4 hover:bg-background transition-colors cursor-pointer ${
        !notif.read ? "bg-primary/5" : ""
      }`}
      onClick={() => {
        if (requestId) onNavigate(`/my-requests`);
      }}
    >
      <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${
          !notif.read ? "font-semibold text-text-primary" : "font-medium text-text-muted"
        }`}>{text}</p>
        {subtext && (
          <p className="text-xs text-text-muted mt-0.5 truncate">{subtext}</p>
        )}
        <p className="text-[10px] text-text-muted mt-1">
          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notif.read && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
      )}
    </li>
  );
}

function NavButton({ icon, label, active = false, disabled = false, onClick }: any) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 min-w-[56px] min-h-[44px] justify-center active:scale-95 transition-all ${active ? "text-primary" : "text-text-muted hover:text-primary"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-primary/10" : ""}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </button>
  );
}

function RequestCard({ request, onClick, className = "flex-shrink-0 w-64 sm:w-72", ...rest }: any) {
  const router = useRouter();
  const tm = useTranslations("map_page");
  const locale = useLocale();
  const sharesFilled = request.shares_filled ?? request.shares_wanted;
  const remaining = Math.max(0, 7 - sharesFilled);
  const isFull = remaining === 0;

  return (
    <div
      onClick={onClick}
      className={`${className} relative bg-white rounded-2xl overflow-hidden border border-border/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group`}
      {...rest}
    >
      {/* Top accent */}
      <div className={`h-0.5 w-full ${isFull ? "bg-accent" : "bg-primary"}`} />

      <div className="p-4 space-y-3">
        {/* Header: area + time */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
            {request.area_name?.split(",")[0] || "Area"}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-text-muted">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(request.created_at))} ago
          </span>
        </div>

        {/* Share segments */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
              {tm("shares_wanted")}
            </span>
            {request.is_joinable && (
              <span className="text-[10px] font-bold text-primary tabular-nums">
                {sharesFilled}<span className="text-text-muted font-normal">/7</span>
              </span>
            )}
          </div>
          <div className="flex gap-[3px]">
            {Array.from({ length: 7 }).map((_, i) => {
              let color = "bg-border/50";
              if (i < request.shares_wanted) {
                color = "bg-primary"; // owner's own shares
              } else if (request.is_joinable && i < sharesFilled) {
                color = "bg-accent"; // approved joiner shares
              }
              return <div key={i} className={`flex-1 h-[5px] rounded-full transition-colors ${color}`} />;
            })}
          </div>
        </div>

        {/* Availability badge */}
        {request.is_joinable && (
          <div>
            {isFull ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                {locale === "en" ? "Fully booked" : "সব ভাগ পূর্ণ"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {locale === "en" ? `${remaining} open` : `${remaining}টি খালি`}
              </span>
            )}
          </div>
        )}

        {/* Footer: budget + action */}
        <div className="flex items-end justify-between pt-2 border-t border-border/40">
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">{tm("budget")}</p>
            <p className="text-sm font-bold text-text-primary">
              {request.budget ? `৳${request.budget.toLocaleString()}` : "—"}
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
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-xl text-[11px] font-bold group-hover:bg-primary-light active:scale-95 transition-all shadow-sm shadow-primary/20"
          >
            {request.hide_phone
              ? <><MessageCircle className="w-3.5 h-3.5" /> {locale === "en" ? "Chat" : "চ্যাট"}</>
              : <><MessageSquare className="w-3.5 h-3.5" /> {locale === "en" ? "Chat" : "চ্যাট"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareBoxes({ count, filled, mini = false }: { count: number, filled?: number, mini?: boolean }) {
  const locale = useLocale();
  return (
    <div className="flex gap-1">
      {Array.from({ length: 7 }).map((_, i) => {
        let cls = "bg-border/50";
        let tip = locale === "en" ? "Available" : "খালি";
        if (i < count) {
          cls = "bg-primary shadow-sm";
          tip = locale === "en" ? "Claimed by owner" : "মালিক দাবি করেছেন";
        } else if (filled !== undefined && i < filled) {
          cls = "bg-accent shadow-sm";
          tip = locale === "en" ? "Claimed by others, approved by owner" : "অন্যরা নিয়েছেন, মালিক অনুমোদিত";
        }
        return (
          <div key={i} className="relative group/box">
            <div className={`rounded-sm cursor-default ${mini ? "w-2.5 h-2.5" : "w-4 h-4"} ${cls}`} />
            {!mini && (
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
                              whitespace-nowrap bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded-md
                              opacity-0 group-hover/box:opacity-100 transition-opacity duration-150">
                {tip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        );
      })}
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

function ShareProgress({ filled, locale }: { filled: number; locale?: string }) {
  const pct = Math.min(100, Math.round((filled / 7) * 100));
  const remaining = Math.max(0, 7 - filled);
  const isFull = filled >= 7;
  return (
    <div className="bg-background rounded-2xl p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
          {locale === "en" ? "Shares" : "শেয়ার"}
        </span>
        <span className="text-xs font-bold text-primary">{filled}/7</span>
      </div>
      <div className="h-2 bg-border/40 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${isFull ? "bg-accent" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isFull ? (
        <span className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs font-bold px-2.5 py-1 rounded-full">
          {locale === "en" ? "Fully booked" : "পূর্ণ হয়ে গেছে"}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
          {locale === "en" ? `${remaining} slot${remaining !== 1 ? "s" : ""} remaining` : `${remaining}টি শেয়ার খালি আছে`}
        </span>
      )}
    </div>
  );
}

function SkeletonCard({ className = "flex-shrink-0 w-64" }: { className?: string }) {
  return (
    <div className={`${className} bg-white border border-border/60 rounded-2xl overflow-hidden animate-pulse`}>
      <div className="h-0.5 bg-border" />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="w-20 h-6 bg-background rounded-lg" />
          <div className="w-16 h-4 bg-background rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <div className="w-16 h-3 bg-background rounded" />
            <div className="w-8 h-3 bg-background rounded" />
          </div>
          <div className="flex gap-[3px]">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 h-[5px] bg-background rounded-full" />
            ))}
          </div>
        </div>
        <div className="w-20 h-5 bg-background rounded-full" />
        <div className="flex items-end justify-between pt-2 border-t border-border/40">
          <div className="space-y-1">
            <div className="w-12 h-3 bg-background rounded" />
            <div className="w-20 h-4 bg-background rounded" />
          </div>
          <div className="w-16 h-8 bg-background rounded-xl" />
        </div>
      </div>
    </div>
  );
}
