"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, CheckCircle2, Trash2, Clock, MapPin, 
  Plus, AlertTriangle, X
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function MyRequestsPage() {
  const router = useRouter();
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
      toast.error("পোস্টগুলো আনতে সমস্যা হয়েছে");
    } else {
      setRequests(data || []);
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
        toast.success("পোস্টটি পূর্ণ হয়েছে হিসেবে চিহ্নিত করা হয়েছে");
      } else {
        const { error } = await supabase
          .from("share_requests")
          .delete()
          .eq("id", id);
        if (error) throw error;
        toast.success("পোস্টটি মুছে ফেলা হয়েছে");
      }
      setConfirming(null);
      fetchRequests();
    } catch (err: any) {
      toast.error("সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    }
  };

  return (
    <div className="min-h-screen bg-background font-hind pb-10">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-border sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-background rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-text-primary" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          My Requests / আমার পোস্ট
        </h1>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : requests.length > 0 ? (
          requests.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-border shadow-sm p-5 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <StatusBadge status={req.status} />
                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(req.created_at))} ago
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-xs text-text-muted mb-1">Shares Wanted</p>
                  <ShareBoxes count={req.shares_wanted} />
                </div>

                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-[10px] text-text-muted uppercase font-bold">Area</p>
                    <p className="font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      {req.area_name?.split(",")[0]}
                    </p>
                  </div>
                  {req.budget && (
                    <div className="text-right">
                      <p className="text-[10px] text-text-muted uppercase font-bold">Budget</p>
                      <p className="font-bold text-primary">৳{req.budget.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                {req.status === "open" && (
                  <button
                    onClick={() => setConfirming({ id: req.id, action: "fill" })}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-primary text-primary rounded-xl text-xs font-bold hover:bg-primary/5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark as Filled
                  </button>
                )}
                <button
                  onClick={() => setConfirming({ id: req.id, action: "delete" })}
                  className="px-4 py-2 border-2 border-error text-error rounded-xl text-xs font-bold hover:bg-error/5 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-6">
            <span className="text-6xl block">🐄</span>
            <div>
              <p className="text-xl font-bold text-text-primary">No requests yet</p>
              <p className="text-text-muted">এখনো কোনো পোস্ট নেই</p>
            </div>
            <Link 
              href="/post-request"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" /> Post your first request
            </Link>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className={`w-8 h-8 ${confirming.action === "delete" ? "text-error" : "text-primary"}`} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">
              {confirming.action === "delete" ? "Are you sure?" : "Confirm Fill"}
            </h3>
            <p className="text-text-muted text-center text-sm mb-6">
              {confirming.action === "delete" 
                ? "This post will be permanently deleted." 
                : "This will mark the post as completed and hide it from the map."}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirming(null)}
                className="flex-1 py-3 border-2 border-border rounded-xl font-bold text-text-muted hover:bg-background transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleAction}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
                  confirming.action === "delete" ? "bg-error hover:bg-opacity-90" : "bg-primary hover:bg-opacity-90"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    open: { label: "Open", labelBn: "সক্রিয়", class: "bg-primary/10 text-primary border-primary/20" },
    filled: { label: "Filled", labelBn: "পূর্ণ হয়েছে", class: "bg-accent/10 text-accent border-accent/20" },
    expired: { label: "Expired", labelBn: "মেয়াদ শেষ", class: "bg-gray-100 text-gray-500 border-gray-200" }
  };
  const config = configs[status] || configs.expired;
  return (
    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${config.class}`}>
      {config.label} / {config.labelBn}
    </div>
  );
}

function ShareBoxes({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div 
          key={i} 
          className={`w-4 h-4 rounded-sm ${i < count ? "bg-primary shadow-sm" : "bg-border/30"}`}
        />
      ))}
    </div>
  );
}
