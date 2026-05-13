"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Logo from "@/components/ui/Logo";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 1: Look up profile
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("phone, security_question")
        .eq("phone", phone)
        .single();

      if (error || !data) {
        throw new Error("এই নম্বরে কোনো অ্যাকাউন্ট নেই");
      }

      setProfile(data);
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || "সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify answer and get token
  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-token",
          phone: phone,
          answer: answer,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "উত্তরটি সঠিক নয়। আবার চেষ্টা করুন।");
      }

      setToken(result.token);
      setStep(3);
    } catch (error: any) {
      toast.error(error.message || "সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("পাসওয়ার্ড দুটি মেলেনি");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset-password",
          phone: phone,
          token: token,
          newPassword: newPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে");
      }

      toast.success("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message || "সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background font-hind">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-warm p-8 border border-border">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Logo width={60} height={60} className="scale-110 mb-4" />
          <p className="text-text-muted text-sm mt-2">Reset your password</p>
        </div>

        {/* Step 1: Phone */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary mb-4 text-center">
              ধাপ ১: ফোন নম্বর দিন
            </h2>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                required
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="scale-50">
                  <LoadingSpinner size={32} className="!gap-0 !flex-row !text-white" />
                </div>
              ) : "Continue"}
            </button>
          </form>
        )}

        {/* Step 2: Security Question */}
        {step === 2 && profile && (
          <form onSubmit={handleStep2} className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary mb-4 text-center">
              ধাপ ২: নিরাপত্তা প্রশ্নের উত্তর দিন
            </h2>
            <div className="bg-background p-4 rounded-xl border border-border mb-4">
              <p className="text-sm text-text-muted mb-1">Security Question:</p>
              <p className="text-text-primary font-medium">{profile.security_question}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Your Answer
              </label>
              <input
                type="text"
                required
                placeholder="আপনার উত্তরটি লিখুন"
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="scale-50">
                  <LoadingSpinner size={32} className="!gap-0 !flex-row !text-white" />
                </div>
              ) : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-text-muted text-sm hover:underline"
            >
              Back to step 1
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <form onSubmit={handleStep3} className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary mb-4 text-center">
              ধাপ ৩: নতুন পাসওয়ার্ড সেট করুন
            </h2>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="নতুন পাসওয়ার্ড"
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                placeholder="নিশ্চিত করুন"
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="scale-50">
                  <LoadingSpinner size={32} className="!gap-0 !flex-row !text-white" />
                </div>
              ) : "Reset Password"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center pt-6 border-t border-border">
          <Link href="/login" className="text-primary font-semibold hover:underline flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
