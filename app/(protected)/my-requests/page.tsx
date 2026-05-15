"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, Trash2, Clock, MapPin,
  Plus, AlertTriangle, Pencil, ClipboardList, MessageCircle, User, Map as MapIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import Logo from "@/components/ui/Logo";
import { useTranslations } from "next-intl";

export default function MyRequestsPage() {
  const router = useRouter();
  const t = useTranslations("requests");
  const tc = useTranslations("common");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<{ id: string; action: "fill" | "delete" } | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("share_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("পোস্টগুলো আনতে সমস্যা হয়েছে");
    } else {
      const reqs = data || [];
      // Fetch pending join request counts for open joinable posts
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
  };

  const handleAction = async () => {
    if (!confirming) return;
    const { id, action } = confirming;

    try {
      if (action === "fill") {
        const { error } = await supabase
          .from("share_requests")
          .update({ status: "filled" })
          .eq("id", id);
        if (error) throw error;
        toast.success(t("fill_success"));
      } else {
        const { error } = await supabase
          .from("share_requests")
          .delete()
          .eq("id", id);
        if (error) throw error;
        toast.success(t("delete_success"));
      }
      setConfirming(null);
      fetchRequests();
    } catch (err: any) {
      toast.error("সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    }
  };

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
          <Link
            href="/post-request"
            className="ml-2 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-light active:scale-95 transition-all shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> New Request
          </Link>
        </nav>

        {/* Mobile: add button */}
        <Link
          href="/post-request"
          className="lg:hidden p-2 bg-primary text-white rounded-xl shadow-md active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </div>

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
              {requests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl border border-border shadow-sm p-5 relative overflow-hidden flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={req.status} />
                      {req.pending_count > 0 && (
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                          {req.pending_count} pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(req.created_at))} ago
                    </div>
                  </div>

                  <div className="space-y-4 mb-6 flex-1">
                    <div>
                      <p className="text-xs text-text-muted mb-1">{t("shares")}</p>
                      <ShareBoxes count={req.shares_wanted} />
                    </div>

                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-[10px] text-text-muted uppercase font-bold">{t("area")}</p>
                        <p className="font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          {req.area_name?.split(",")[0]}
                        </p>
                      </div>
                      {req.budget && (
                        <div className="text-right">
                          <p className="text-[10px] text-text-muted uppercase font-bold">{t("budget")}</p>
                          <p className="font-bold text-primary">৳{req.budget.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-border">
                    {req.status === "open" && (
                      <button
                        onClick={() => setConfirming({ id: req.id, action: "fill" })}
                        className="flex-1 flex items-center justify-center gap-2 h-10 min-w-[80px] px-3 border-2 border-primary text-primary rounded-xl text-xs font-bold hover:bg-primary/5 active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" /> {t("mark_filled")}
                      </button>
                    )}
                    <Link
                      href={`/edit-request/${req.id}`}
                      className="flex items-center justify-center gap-2 h-10 min-w-[80px] px-3 border-2 border-primary text-primary rounded-xl text-xs font-bold hover:bg-primary/5 active:scale-95 transition-all"
                    >
                      <Pencil className="w-4 h-4" /> {t("edit")}
                    </Link>
                    <button
                      onClick={() => setConfirming({ id: req.id, action: "delete" })}
                      className="flex items-center justify-center h-10 w-10 border-2 border-error text-error rounded-xl hover:bg-error/5 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
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

function ShareBoxes({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className={`w-5 h-5 rounded-sm ${i < count ? "bg-primary shadow-sm" : "bg-border/30"}`}
        />
      ))}
    </div>
  );
}
