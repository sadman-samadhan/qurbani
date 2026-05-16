"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, Trash2, Clock, MapPin,
  Plus, AlertTriangle, Pencil, ClipboardList, MessageCircle, User, Map as MapIcon,
  X, UserPlus, Bell
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import Logo from "@/components/ui/Logo";
import { useTranslations, useLocale } from "next-intl";

export default function MyRequestsPage() {
  const router = useRouter();
  const t = useTranslations("requests");
  const tc = useTranslations("common");
  const locale = useLocale();

  // ── Existing state ──────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<{ id: string; action: "fill" | "delete" } | null>(null);

  // ── Phase 8 state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"posts" | "sent" | "received">("posts");
  const [profile, setProfile] = useState<any>(null);
  const [sentJoinReqs, setSentJoinReqs] = useState<any[]>([]);
  const [receivedJoinReqs, setReceivedJoinReqs] = useState<any[]>([]);
  const [joinLoading, setJoinLoading] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState<{ id: string; status: string; approvedAt?: string } | null>(null);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [approveConfirm, setApproveConfirm] = useState<any | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Notifications ───────────────────────────────────────────────────────────
  const [notifCount, setNotifCount] = useState(0);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // ── Existing fetch ──────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("share_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("পোস্টগুলো আনতে সমস্যা হয়েছে");
    } else {
      const reqs = data || [];
      const openIds = reqs.filter((r: any) => r.status === "open" && r.is_joinable).map((r: any) => r.id);
      let pendingCounts: Record<string, number> = {};
      if (openIds.length > 0) {
        const { data: jrData } = await supabase
          .from("join_requests")
          .select("request_id")
          .in("request_id", openIds)
          .eq("status", "pending");
        (jrData || []).forEach((jr: any) => {
          pendingCounts[jr.request_id] = (pendingCounts[jr.request_id] || 0) + 1;
        });
      }
      setRequests(reqs.map((r: any) => ({ ...r, pending_count: pendingCounts[r.id] || 0 })));
    }
    setLoading(false);
  }, []);

  // ── Existing action handler ─────────────────────────────────────────────────
  const handleAction = async () => {
    if (!confirming) return;
    const { id, action } = confirming;
    try {
      if (action === "fill") {
        const { error } = await supabase.from("share_requests").update({ status: "filled" }).eq("id", id);
        if (error) throw error;
        toast.success(t("fill_success"));
      } else {
        const { error } = await supabase.from("share_requests").delete().eq("id", id);
        if (error) throw error;
        toast.success(t("delete_success"));
      }
      setConfirming(null);
      if (profile) fetchRequests(profile.id);
    } catch {
      toast.error("সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    }
  };

  // ── Phase 8 fetch functions ─────────────────────────────────────────────────
  const fetchSentJoinRequests = useCallback(async (userId: string) => {
    setJoinLoading(true);
    const { data } = await supabase
      .from("join_requests")
      .select(`
        id, status, shares_wanted, created_at, approved_at,
        share_requests:request_id ( id, area_name )
      `)
      .eq("requester_id", userId)
      .order("created_at", { ascending: false });
    setSentJoinReqs(data || []);
    setJoinLoading(false);
  }, []);

  const fetchReceivedJoinRequests = useCallback(async (userId: string) => {
    setJoinLoading(true);
    const { data: myPosts } = await supabase
      .from("share_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("is_joinable", true);

    if (!myPosts?.length) {
      setReceivedJoinReqs([]);
      setJoinLoading(false);
      return;
    }

    const postIds = myPosts.map((p: any) => p.id);
    const { data } = await supabase
      .from("join_requests")
      .select(`
        id, status, shares_wanted, created_at, request_id, requester_id,
        requester:requester_id ( full_name, penalty_count ),
        share_requests:request_id ( id, area_name )
      `)
      .in("request_id", postIds)
      .order("created_at", { ascending: false });
    setReceivedJoinReqs(data || []);
    setJoinLoading(false);
  }, []);

  const fetchNotifications = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("notifications")
      .select(`id, type, read, created_at, join_requests ( id, shares_wanted, request_id, share_requests:request_id ( area_name ), requester:requester_id ( full_name ) )`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications(data || []);
    setNotifCount((data || []).filter((n: any) => !n.read).length);
  }, []);

  const markAllNotificationsRead = async (userId: string) => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    setNotifCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // ── Phase 8 action handlers ─────────────────────────────────────────────────
  const handleWithdrawSent = async () => {
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
      fetchSentJoinRequests(profile.id);
    } catch {
      toast.error(locale === "en" ? "Something went wrong." : "সমস্যা হয়েছে।");
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const handleApproveReceived = async () => {
    if (!approveConfirm || !profile) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("join_requests")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", approveConfirm.id);
      if (error) throw error;

      const phone = profile.phone_number || profile.whatsapp_number || "";
      await supabase.from("messages").insert({
        sender_id: profile.id,
        receiver_id: approveConfirm.requester_id,
        request_id: approveConfirm.request_id,
        content: locale === "en"
          ? `✅ Request approved. Contact: ${phone}`
          : `✅ আপনার অনুরোধ অনুমোদিত হয়েছে। যোগাযোগ: ${phone}`,
        is_system_message: true,
      });

      toast.success(locale === "en" ? "Request approved!" : "অনুরোধ অনুমোদিত হয়েছে!");
      setApproveConfirm(null);
      fetchReceivedJoinRequests(profile.id);
    } catch {
      toast.error(locale === "en" ? "Something went wrong." : "সমস্যা হয়েছে।");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectReceived = async () => {
    if (!rejectConfirm || !profile) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("join_requests")
        .update({ status: "rejected" })
        .eq("id", rejectConfirm.id);
      if (error) throw error;

      await supabase.from("messages").insert({
        sender_id: profile.id,
        receiver_id: rejectConfirm.requester_id,
        request_id: rejectConfirm.request_id,
        content: locale === "en"
          ? "Your request could not be accepted. Thank you."
          : "আপনার অনুরোধ গ্রহণ করা সম্ভব হয়নি। ধন্যবাদ।",
        is_system_message: true,
      });

      toast.success(locale === "en" ? "Request rejected." : "অনুরোধ প্রত্যাখ্যান করা হয়েছে।");
      setRejectConfirm(null);
      fetchReceivedJoinRequests(profile.id);
    } catch {
      toast.error(locale === "en" ? "Something went wrong." : "সমস্যা হয়েছে।");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData) setProfile(profileData);

      fetchRequests(user.id);
      fetchSentJoinRequests(user.id);
      fetchReceivedJoinRequests(user.id);
      fetchNotifications(user.id);
    }
    init();
  }, [fetchRequests, fetchSentJoinRequests, fetchReceivedJoinRequests, fetchNotifications]);

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("notifs_my_requests")
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        () => fetchNotifications(profile.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, fetchNotifications]);

  // pending counts for badges
  const pendingSentCount = sentJoinReqs.filter(jr => jr.status === "pending" || jr.status === "approved").length;
  const pendingReceivedCount = receivedJoinReqs.filter(jr => jr.status === "pending").length;

  return (
    <div className="min-h-screen bg-background font-hind pb-10">
      {/* Header — mobile: back arrow | desktop: full nav */}
      <div className="bg-white px-4 lg:px-6 py-3 flex items-center justify-between border-b border-border sticky top-0 z-10">
        {/* Mobile: back + title */}
        <div className="flex items-center gap-3 lg:hidden">
          <button onClick={() => router.back()} className="p-2 hover:bg-background rounded-full transition-colors active:scale-95">
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">{t("title")}</h1>
        </div>

        {/* Desktop: logo */}
        <div className="hidden lg:block">
          <Logo width={32} height={32} />
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-primary hover:bg-primary/5 text-sm font-medium rounded-xl transition-colors"
          >
            <MapIcon className="w-4 h-4" /> Map
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-primary font-bold text-sm rounded-xl bg-primary/10">
            <ClipboardList className="w-4 h-4" /> {t("title")}
          </button>
          <button
            onClick={() => router.push("/messages")}
            className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-primary hover:bg-primary/5 text-sm font-medium rounded-xl transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Messages
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-primary hover:bg-primary/5 text-sm font-medium rounded-xl transition-colors"
          >
            <User className="w-4 h-4" /> Profile
          </button>
          <div className="relative">
            <button
              onClick={() => { setNotifPanelOpen(true); if (notifCount > 0 && profile) markAllNotificationsRead(profile.id); }}
              className="flex items-center gap-2 px-3 py-2 text-text-muted hover:text-primary hover:bg-primary/5 text-sm font-medium rounded-xl transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>
            {notifCount > 0 && (
              <span className="absolute -top-1 right-0 bg-error text-[8px] text-white px-1.5 py-0.5 rounded-full font-bold min-w-[16px] text-center pointer-events-none">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </div>
          <Link
            href="/post-request"
            className="ml-2 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-light active:scale-95 transition-all shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> New Request
          </Link>
        </nav>

        {/* Mobile: bell + add */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => { setNotifPanelOpen(true); if (notifCount > 0 && profile) markAllNotificationsRead(profile.id); }}
              className="p-2 rounded-xl hover:bg-primary/5 active:scale-95 transition-all"
            >
              <Bell className="w-5 h-5 text-text-muted" />
            </button>
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-error text-[8px] text-white px-1.5 py-0.5 rounded-full font-bold min-w-[16px] text-center pointer-events-none">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </div>
          <Link
            href="/post-request"
            className="p-2 bg-primary text-white rounded-xl shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* ── Tab Navigation (Phase 8) ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-border px-4 lg:px-6 flex gap-1">
        {(["posts", "sent", "received"] as const).map((tab) => {
          const labels = {
            posts:    { bn: "আমার পোস্ট",    en: "My Posts" },
            sent:     { bn: "পাঠানো",         en: "Sent" },
            received: { bn: "প্রাপ্ত",        en: "Received" },
          };
          const badge = tab === "sent" ? pendingSentCount : tab === "received" ? pendingReceivedCount : 0;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex items-center gap-1.5 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              {locale === "en" ? labels[tab].en : labels[tab].bn}
              {badge > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── My Posts Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "posts" && (
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-border p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <Skeleton className="w-20 h-6 rounded-full" />
                    <Skeleton className="w-24 h-4" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="w-full h-8" />
                    <Skeleton className="w-2/3 h-4" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="flex-1 h-10 rounded-xl" />
                    <Skeleton className="w-10 h-10 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : requests.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {requests.map((req) => {
                  const sharesFilled = req.shares_filled ?? req.shares_wanted;
                  const hasJoiners = sharesFilled > req.shares_wanted;
                  return (
                  <div key={req.id} className="bg-white rounded-2xl overflow-hidden border border-border/60 shadow-sm hover:shadow-md transition-all flex flex-col">
                    {/* Top accent */}
                    <div className={`h-0.5 ${req.status === "open" ? "bg-primary" : req.status === "filled" ? "bg-accent" : "bg-border"}`} />

                    <div className="p-5 flex flex-col flex-1">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex flex-col gap-1.5">
                          <StatusBadge status={req.status} />
                          {req.pending_count > 0 && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 w-fit">
                              <UserPlus className="w-3 h-3" />
                              {req.pending_count} {locale === "en" ? "pending" : "অপেক্ষায়"}
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-[10px] text-text-muted flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(req.created_at))} ago
                        </span>
                      </div>

                      {/* Shares */}
                      <div className="mb-4">
                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-2">{t("shares")}</p>
                        <ShareBoxes count={req.shares_wanted} filled={sharesFilled} />
                        {hasJoiners && (
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-[10px] text-text-muted">
                              <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
                              {locale === "en" ? "Owner" : "মালিক"}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-text-muted">
                              <span className="w-2.5 h-2.5 rounded-sm bg-accent inline-block" />
                              {locale === "en" ? "Approved" : "অনুমোদিত"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex items-end justify-between flex-1 mb-4">
                        <div>
                          <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">{t("area")}</p>
                          <p className="text-sm font-semibold flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            {req.area_name?.split(",")[0]}
                          </p>
                        </div>
                        {req.budget && (
                          <div className="text-right">
                            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">{t("budget")}</p>
                            <p className="text-sm font-bold text-primary">৳{req.budget.toLocaleString()}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t border-border/40">
                        {req.status === "open" && (
                          <button
                            onClick={() => setConfirming({ id: req.id, action: "fill" })}
                            className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-bold hover:bg-primary/15 active:scale-95 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{t("mark_filled")}</span>
                          </button>
                        )}
                        <Link
                          href={`/edit-request/${req.id}`}
                          className="flex items-center justify-center gap-1.5 h-9 px-3 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-bold hover:bg-primary/15 active:scale-95 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>{t("edit")}</span>
                        </Link>
                        <button
                          onClick={() => setConfirming({ id: req.id, action: "delete" })}
                          className="flex items-center justify-center h-9 w-9 bg-red-50 border border-error/20 text-error rounded-xl hover:bg-error/10 active:scale-95 transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              <div className="pt-6 pb-12">
                <Link
                  href="/post-request"
                  className="w-full flex items-center justify-center gap-3 py-5 bg-white border-2 border-dashed border-primary/40 text-primary rounded-3xl font-bold hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-lg">{t("empty_cta")}</span>
                </Link>
              </div>
            </>
          ) : (
            <div className="py-20 flex flex-col items-center text-center space-y-6 max-w-sm mx-auto">
              <div className="relative">
                <div className="w-32 h-32 bg-primary-lighter rounded-full flex items-center justify-center shadow-inner">
                  <span className="text-6xl" role="img" aria-label="cow">🐄</span>
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent-lighter border-2 border-accent/30 rounded-full flex items-center justify-center shadow-sm">
                  <Plus className="w-5 h-5 text-accent-dark" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xl font-bold text-text-primary">{t("empty_title")}</p>
                <p className="text-sm text-text-muted leading-relaxed">
                  কোরবানির জন্য একটি শেয়ার অনুরোধ পোস্ট করুন এবং কাছের মানুষদের সাথে সংযুক্ত হন।
                </p>
              </div>
              <Link
                href="/post-request"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-light active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5" /> {t("empty_cta")}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Sent Join Requests Tab (Phase 8) ─────────────────────────────────── */}
      {activeTab === "sent" && (
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          {joinLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="w-20 h-5 rounded-full" />
                    <Skeleton className="w-16 h-4" />
                  </div>
                  <Skeleton className="w-40 h-4" />
                  <Skeleton className="w-full h-9 rounded-xl" />
                </div>
              ))}
            </div>
          ) : sentJoinReqs.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center space-y-4 max-w-sm mx-auto">
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center">
                <UserPlus className="w-10 h-10 text-primary/40" />
              </div>
              <p className="text-text-muted text-sm leading-relaxed">
                {locale === "en"
                  ? "You haven't requested to join any posts yet."
                  : "আপনি এখনো কোনো পোস্টে যোগ দেওয়ার অনুরোধ করেননি।"}
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm active:scale-95 transition-all"
              >
                {locale === "en" ? "Browse Nearby Posts" : "কাছের পোস্ট দেখুন"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sentJoinReqs.map((jr) => {
                const area = (jr.share_requests as any)?.area_name?.split(",")[0] || "—";
                const canWithdraw = jr.status === "pending" || jr.status === "approved";
                return (
                  <div key={jr.id} className="bg-white rounded-2xl border border-border shadow-sm p-4">
                    <div className="flex items-start justify-between mb-2">
                      <JoinStatusChip status={jr.status} locale={locale} />
                      <span className="text-[10px] text-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(jr.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-text-primary flex items-center gap-1 mb-0.5">
                      <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {area}
                    </p>
                    <p className="text-xs text-text-muted mb-3">
                      {locale === "en"
                        ? `${jr.shares_wanted} share(s) requested`
                        : `${jr.shares_wanted}টি শেয়ারের অনুরোধ`}
                    </p>

                    {canWithdraw && (
                      <button
                        onClick={() => setWithdrawConfirm({
                          id: jr.id,
                          status: jr.status,
                          approvedAt: jr.approved_at,
                        })}
                        className="w-full py-2 rounded-xl border border-border text-text-muted text-xs font-semibold hover:border-error hover:text-error hover:bg-red-50 active:scale-95 transition-all"
                      >
                        {locale === "en" ? "Withdraw Request" : "অনুরোধ প্রত্যাহার করুন"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Received Join Requests Tab (Phase 8) ─────────────────────────────── */}
      {activeTab === "received" && (
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          {joinLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="w-28 h-4" />
                      <Skeleton className="w-20 h-3" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Skeleton className="flex-1 h-9 rounded-xl" />
                    <Skeleton className="flex-1 h-9 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : receivedJoinReqs.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center space-y-4 max-w-sm mx-auto">
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center">
                <ClipboardList className="w-10 h-10 text-primary/40" />
              </div>
              <p className="text-text-muted text-sm">
                {locale === "en"
                  ? "No join requests received yet."
                  : "এখনো কোনো যোগ দেওয়ার অনুরোধ আসেনি।"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {receivedJoinReqs.map((jr) => {
                const requester = jr.requester as any;
                const area = (jr.share_requests as any)?.area_name?.split(",")[0] || "—";
                const isPending = jr.status === "pending";
                return (
                  <div key={jr.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${isPending ? "border-amber-200" : "border-border"}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {requester?.full_name?.[0] || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-primary text-sm truncate">
                          {requester?.full_name || (locale === "en" ? "Unknown" : "অজানা")}
                        </p>
                        {(requester?.penalty_count ?? 0) > 0 && (
                          <p className="text-xs text-amber-600 font-semibold">
                            ⚠️ {requester.penalty_count} {locale === "en" ? "penalty(ies)" : "পেনাল্টি"}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[10px] text-text-muted">
                          {formatDistanceToNow(new Date(jr.created_at), { addSuffix: true })}
                        </span>
                        {!isPending && <JoinStatusChip status={jr.status} locale={locale} />}
                      </div>
                    </div>

                    <p className="text-xs text-text-muted mb-3">
                      <MapPin className="w-3 h-3 inline mr-1 text-primary" />
                      {area} &bull; {jr.shares_wanted} {locale === "en" ? "share(s)" : "শেয়ার"}
                    </p>

                    {isPending && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRejectConfirm({
                            id: jr.id,
                            requester_id: jr.requester_id,
                            request_id: jr.request_id,
                            requesterName: requester?.full_name,
                            sharesWanted: jr.shares_wanted,
                          })}
                          className="flex-1 py-2 rounded-xl border-2 border-error/40 text-error text-xs font-bold hover:bg-red-50 active:scale-95 transition-all"
                        >
                          {locale === "en" ? "Reject" : "প্রত্যাখ্যান করুন"}
                        </button>
                        <button
                          onClick={() => setApproveConfirm({
                            id: jr.id,
                            requester_id: jr.requester_id,
                            request_id: jr.request_id,
                            requesterName: requester?.full_name,
                            sharesWanted: jr.shares_wanted,
                          })}
                          className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all"
                        >
                          {locale === "en" ? "Approve" : "অনুমোদন করুন"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Existing: Fill / Delete confirm dialog ───────────────────────────── */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className={`w-8 h-8 ${confirming.action === "delete" ? "text-error" : "text-primary"}`} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">
              {confirming.action === "delete" ? t("confirm_delete") : t("confirm_fill")}
            </h3>
            <p className="text-text-muted text-center text-sm mb-6">
              {confirming.action === "delete" ? t("delete_msg") : t("fill_msg")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(null)}
                className="flex-1 py-3 border-2 border-border rounded-xl font-bold text-text-muted hover:bg-background transition-all active:scale-95"
              >
                {tc("cancel")}
              </button>
              <button
                onClick={handleAction}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95 ${
                  confirming.action === "delete" ? "bg-error hover:bg-opacity-90" : "bg-primary hover:bg-opacity-90"
                }`}
              >
                {tc("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 8: Withdraw dialog ─────────────────────────────────────────── */}
      {withdrawConfirm && (() => {
        const willIncurPenalty =
          withdrawConfirm.status === "approved" &&
          withdrawConfirm.approvedAt != null &&
          Date.now() - new Date(withdrawConfirm.approvedAt).getTime() > 24 * 60 * 60 * 1000;
        const penaltyCount = (profile?.penalty_count || 0) + 1;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${willIncurPenalty ? "bg-amber-100" : "bg-background"}`}>
                <AlertTriangle className={`w-7 h-7 ${willIncurPenalty ? "text-amber-600" : "text-text-muted"}`} />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">
                {locale === "en" ? "Withdraw Request?" : "অনুরোধ প্রত্যাহার করবেন?"}
              </h3>
              <p className="text-sm text-text-muted text-center mb-6">
                {willIncurPenalty
                  ? (locale === "en"
                    ? `⚠️ Warning: 24H has passed. Withdrawing will add 1 penalty. (${penaltyCount}/5)`
                    : `⚠️ সতর্কতা: ২৪ ঘণ্টা পার হয়েছে। প্রত্যাহার করলে ১টি পেনাল্টি যোগ হবে। (${penaltyCount}/৫)`)
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
                  onClick={handleWithdrawSent}
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

      {/* ── Phase 8: Approve dialog ──────────────────────────────────────────── */}
      {approveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">
              {locale === "en" ? "Approve Request?" : "অনুরোধ অনুমোদন করবেন?"}
            </h3>
            <p className="text-sm text-text-muted text-center mb-6">
              {locale === "en"
                ? `Give ${approveConfirm.sharesWanted} share(s) to ${approveConfirm.requesterName}? Phone numbers will be shared after approval.`
                : `${approveConfirm.requesterName}-কে ${approveConfirm.sharesWanted}টি শেয়ার দেবেন? অনুমোদনের পরে ফোন নম্বর শেয়ার হয়ে যাবে।`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setApproveConfirm(null)}
                className="flex-1 py-3 border-2 border-border rounded-xl font-bold text-text-muted hover:bg-background transition-all active:scale-95"
              >
                {locale === "en" ? "Cancel" : "বাতিল"}
              </button>
              <button
                onClick={handleApproveReceived}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-60"
              >
                {actionLoading ? "…" : (locale === "en" ? "Approve" : "অনুমোদন করুন")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Panel ──────────────────────────────────────────────── */}
      {notifPanelOpen && (
        <div className="fixed inset-0 z-[10002] flex items-end lg:items-start lg:justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setNotifPanelOpen(false)} />
          <div className="relative w-full lg:w-96 lg:max-h-[85vh] lg:mt-14 lg:mr-4 bg-white rounded-t-[2.5rem] lg:rounded-2xl shadow-2xl animate-in slide-in-from-bottom lg:slide-in-from-top duration-300 flex flex-col max-h-[80vh]">
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mt-4 flex-shrink-0 lg:hidden" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                {locale === "en" ? "Notifications" : "নোটিফিকেশন"}
              </h2>
              <button onClick={() => setNotifPanelOpen(false)} className="p-1.5 rounded-xl bg-background hover:bg-border/30 active:scale-95 transition-all">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <span className="text-4xl mb-3">🔔</span>
                  <p className="text-text-muted text-sm">{locale === "en" ? "No new notifications." : "কোনো নতুন নোটিফিকেশন নেই।"}</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((notif: any) => (
                    <NotificationItem key={notif.id} notif={notif} locale={locale} onNavigate={(path: string) => { setNotifPanelOpen(false); router.push(path); }} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 8: Reject dialog ───────────────────────────────────────────── */}
      {rejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-7 h-7 text-error" />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">
              {locale === "en" ? "Reject Request?" : "অনুরোধ প্রত্যাখ্যান করবেন?"}
            </h3>
            <p className="text-sm text-text-muted text-center mb-6">
              {locale === "en"
                ? `Reject ${rejectConfirm.requesterName}'s request for ${rejectConfirm.sharesWanted} share(s)?`
                : `${rejectConfirm.requesterName}-এর ${rejectConfirm.sharesWanted}টি শেয়ারের অনুরোধ প্রত্যাখ্যান করবেন?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRejectConfirm(null)}
                className="flex-1 py-3 border-2 border-border rounded-xl font-bold text-text-muted hover:bg-background transition-all active:scale-95"
              >
                {locale === "en" ? "Cancel" : "বাতিল"}
              </button>
              <button
                onClick={handleRejectReceived}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-error hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-60"
              >
                {actionLoading ? "…" : (locale === "en" ? "Reject" : "প্রত্যাখ্যান করুন")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("requests");
  const configs: Record<string, { key: string; cls: string }> = {
    open:    { key: "status_open",    cls: "bg-primary/10 text-primary border-primary/30" },
    filled:  { key: "status_filled",  cls: "bg-accent/15 text-accent-dark border-accent/30" },
    expired: { key: "status_expired", cls: "bg-gray-100 text-gray-500 border-gray-200" },
  };
  const config = configs[status] || configs.expired;
  return (
    <div className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${config.cls}`}>
      {t(config.key as any)}
    </div>
  );
}

function ShareBoxes({ count, filled }: { count: number; filled?: number }) {
  const locale = useLocale();
  return (
    <div className="flex gap-1">
      {Array.from({ length: 7 }).map((_, i) => {
        let cls = "bg-border/30";
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
            <div className={`w-5 h-5 rounded-sm cursor-default ${cls}`} />
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
                            whitespace-nowrap bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded-md
                            opacity-0 group-hover/box:opacity-100 transition-opacity duration-150">
              {tip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotificationItem({ notif, locale, onNavigate }: any) {
  const { formatDistanceToNow } = require("date-fns");
  const jr = notif.join_requests;
  const requesterName = jr?.requester?.full_name || (locale === "en" ? "Someone" : "কেউ");
  const areaName = jr?.share_requests?.area_name?.split(",")[0] || "";
  const requestId = jr?.request_id;

  const map: Record<string, { icon: string; en: string; bn: string }> = {
    join_request:  { icon: "👤", en: `${requesterName} wants to join your post`,     bn: `${requesterName} আপনার পোস্টে যোগ দিতে চান` },
    join_approved: { icon: "✅", en: "Your join request was approved",               bn: "আপনার অনুরোধ অনুমোদিত হয়েছে" },
    join_rejected: { icon: "❌", en: "Your join request was not accepted",           bn: "আপনার অনুরোধ গৃহীত হয়নি" },
    join_withdrawn:{ icon: "↩️", en: `${requesterName} withdrew their request`,      bn: `${requesterName} তাদের অনুরোধ প্রত্যাহার করেছেন` },
  };
  const cfg = map[notif.type] || { icon: "🔔", en: "New notification", bn: "নতুন নোটিফিকেশন" };

  return (
    <li
      className={`flex items-start gap-3 px-5 py-4 hover:bg-background transition-colors cursor-pointer ${!notif.read ? "bg-primary/5" : ""}`}
      onClick={() => { if (requestId) onNavigate("/my-requests"); }}
    >
      <span className="text-xl flex-shrink-0 mt-0.5">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notif.read ? "font-semibold text-text-primary" : "font-medium text-text-muted"}`}>
          {locale === "en" ? cfg.en : cfg.bn}
        </p>
        {areaName && <p className="text-xs text-text-muted mt-0.5 truncate">{areaName}</p>}
        <p className="text-[10px] text-text-muted mt-1">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</p>
      </div>
      {!notif.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
    </li>
  );
}

function JoinStatusChip({ status, locale }: { status: string; locale: string }) {
  const configs: Record<string, { bn: string; en: string; cls: string }> = {
    pending:   { bn: "অপেক্ষায়",   en: "Pending",   cls: "bg-amber-100 text-amber-700 border-amber-200" },
    approved:  { bn: "অনুমোদিত",   en: "Approved",  cls: "bg-green-100 text-green-700 border-green-200" },
    rejected:  { bn: "প্রত্যাখ্যাত", en: "Rejected",  cls: "bg-red-100 text-red-600 border-red-200" },
    withdrawn: { bn: "প্রত্যাহার",  en: "Withdrawn", cls: "bg-gray-100 text-gray-500 border-gray-200" },
  };
  const cfg = configs[status] || configs.withdrawn;
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
      {locale === "en" ? cfg.en : cfg.bn}
    </span>
  );
}
