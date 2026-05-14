"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Check, X, User, MapPin, 
  Users, Clock, AlertTriangle, CheckCircle2 
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslations } from "next-intl";

export default function ApprovePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("notifications");
  const requestId = searchParams.get("request_id");
  const applicantId = searchParams.get("applicant_id");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [myVote, setMyVote] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (!requestId || !applicantId) {
      router.push("/dashboard");
      return;
    }
    fetchData();
  }, [requestId, applicantId]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const [requestRes, applicantRes, membershipRes, membersRes, myVoteRes] = await Promise.all([
        supabase.from("share_requests").select("*").eq("id", requestId).single(),
        supabase.from("profiles").select("*").eq("id", applicantId).single(),
        supabase.from("request_members").select("*").eq("request_id", requestId).eq("user_id", applicantId).single(),
        supabase.from("request_members").select("*, profiles(full_name)").eq("request_id", requestId).eq("status", "approved"),
        supabase.from("join_approvals").select("*").eq("request_id", requestId).eq("applicant_id", applicantId).eq("approver_id", user?.id).single()
      ]);

      if (requestRes.error) throw requestRes.error;

      setData({
        request: requestRes.data,
        applicant: applicantRes.data,
        membership: membershipRes.data,
        approvedMembers: membersRes.data || []
      });
      setMyVote(myVoteRes.data);

    } catch (err: any) {
      console.error("Fetch error:", err);
      toast.error("Error loading request details");
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: "approved" | "rejected") => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/join-request/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          applicant_id: applicantId,
          decision
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to submit decision");

      toast.success(decision === "approved" ? "Approved successfully" : "Rejected successfully");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size={40} />
    </div>
  );

  if (!data || !data.membership) return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Request Not Found</h2>
        <p className="text-text-muted mb-6">This join request might have been cancelled or already processed.</p>
        <button onClick={() => router.push("/dashboard")} className="w-full bg-primary text-white py-3 rounded-xl font-bold">
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  const { request, applicant, membership, approvedMembers } = data;
  const sharesRemaining = 7 - request.shares_filled;
  const afterSharesRemaining = sharesRemaining - membership.shares_taken;
  const isResolved = membership.status !== "pending";

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="bg-white px-4 py-4 border-b border-border flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Join Request</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {/* Banner for resolved requests */}
        {isResolved && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border-2 ${
            membership.status === "approved" 
              ? "bg-green-50 border-green-200 text-green-700" 
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {membership.status === "approved" ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            <div>
              <p className="font-bold">This request is already {membership.status}</p>
              <p className="text-sm opacity-80">No further action is required.</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden">
          {/* Applicant Info */}
          <div className="p-6 border-b border-border text-center bg-gray-50/50">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
              <User className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">
              {request.hide_name ? "Anonymous" : applicant.full_name}
            </h2>
            <div className="flex items-center justify-center gap-2 text-text-muted mt-1">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{request.area_name}</span>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Shares Request Visual */}
            <div>
              <p className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Requested Shares
              </p>
              
              <div className="flex gap-2 mb-4">
                {Array.from({ length: 7 }).map((_, i) => {
                  let color = "bg-border/30";
                  if (i < request.shares_filled) color = "bg-primary shadow-sm";
                  else if (i < request.shares_filled + membership.shares_taken) color = "bg-amber-400 shadow-sm";
                  
                  return (
                    <div 
                      key={i} 
                      className={`flex-1 h-10 rounded-lg transition-all ${color}`}
                    />
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Applicant wants:</span>
                  <span className="font-bold text-amber-600">{membership.shares_taken} shares</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Current filled:</span>
                  <span className="font-bold text-primary">{request.shares_filled} shares</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-dashed">
                  <span className="text-text-muted">Remaining after approval:</span>
                  <span className={`font-bold ${afterSharesRemaining < 0 ? "text-error" : "text-text-primary"}`}>
                    {afterSharesRemaining} shares
                  </span>
                </div>
              </div>
            </div>

            {/* Current Members */}
            <div>
              <p className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Current Members
              </p>
              <div className="space-y-3">
                {approvedMembers.length === 0 ? (
                  <p className="text-xs italic text-text-muted">No members yet (excluding owner)</p>
                ) : (
                  approvedMembers.map((m: any) => (
                    <div key={m.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                          {m.profiles.full_name?.[0] || "?"}
                        </div>
                        <span className="text-sm font-medium">{m.profiles.full_name}</span>
                      </div>
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-lg">
                        {m.shares_taken} shares
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border space-y-3">
              {myVote && myVote.decision !== "pending" ? (
                <div className={`p-4 rounded-2xl flex items-center justify-center gap-2 font-bold ${
                  myVote.decision === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {myVote.decision === "approved" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  You voted to {myVote.decision}
                </div>
              ) : isResolved ? null : (
                <>
                  <button
                    disabled={submitting}
                    onClick={() => handleDecision("approved")}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-all disabled:opacity-50"
                  >
                    {submitting ? <LoadingSpinner size={20} /> : <Check className="w-5 h-5" />}
                    Approve
                  </button>
                  <button
                    disabled={submitting}
                    onClick={() => handleDecision("rejected")}
                    className="w-full border-2 border-error text-error py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function XCircle({ className }: { className?: string }) {
  return <X className={className} />;
}
