"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Logo from "@/components/ui/Logo";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const t = useTranslations("forgot");
  const ta = useTranslations("auth");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
      toast.error(error.message || "সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

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
      toast.error(error.message || "সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

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
        throw new Error(result.error || "পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে");
      }

      toast.success("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message || "সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 h-12 text-base rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all";

  const stepLabels = ["ফোন নম্বর", "পরিচয় যাচাই", "নতুন পাসওয়ার্ড"];

  return (
    <div className="min-h-screen lg:flex font-hind">
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex flex-col items-center justify-center lg:w-1/2 bg-gradient-to-br from-primary-dark via-primary to-primary-light text-white p-12 relative overflow-hidden sticky top-0 h-screen">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-36 translate-x-36" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-28 -translate-x-28" />
        <div className="absolute top-1/2 right-8 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <Image
            src="/images/logo.png"
            alt="QurbaniSathi"
            width={88}
            height={88}
            className="mb-6 drop-shadow-lg"
            priority
          />
          <h1 className="text-3xl font-bold tracking-tight mb-1">QurbaniSathi</h1>
          <p className="text-accent-light text-xl font-semibold mb-6">কোরবানি সাথী</p>
          <p className="text-white/80 text-lg leading-relaxed">{t("subtitle")}</p>

          {/* Step indicator */}
          <div className="mt-10 flex gap-3 items-center">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step === i + 1
                      ? "bg-accent text-primary-dark"
                      : step > i + 1
                      ? "bg-white/30 text-white"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                {i < stepLabels.length - 1 && (
                  <div
                    className={`w-6 h-0.5 ${step > i + 1 ? "bg-white/40" : "bg-white/20"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex min-h-screen items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 text-center lg:hidden">
            <Logo width={60} height={60} className="scale-110 mb-4" />
            <p className="text-text-muted text-sm mt-2">{t("subtitle")}</p>
          </div>

          {/* Mobile step dots */}
          <div className="flex justify-center gap-2 mb-6 lg:hidden">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  step === s ? "w-6 bg-primary" : step > s ? "w-2 bg-primary/40" : "w-2 bg-border"
                }`}
              />
            ))}
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-text-primary">{t("title")}</h2>
            <p className="text-text-muted mt-1">{stepLabels[step - 1]}</p>
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-5">
              <h2 className="text-lg font-semibold text-text-primary lg:hidden">{t("step1_title")}</h2>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {ta("phone")}
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-light active:scale-95 text-white font-bold h-12 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  t("continue")
                )}
              </button>
            </form>
          )}

          {/* Step 2 */}
          {step === 2 && profile && (
            <form onSubmit={handleStep2} className="space-y-5">
              <h2 className="text-lg font-semibold text-text-primary lg:hidden">{t("step2_title")}</h2>
              <div className="bg-primary-lighter p-4 rounded-xl border border-primary/20">
                <p className="text-xs text-text-muted mb-1">{t("security_question_label")}</p>
                <p className="text-text-primary font-medium">{profile.security_question}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {t("answer_label")}
                </label>
                <input
                  type="text"
                  required
                  placeholder="আপনার উত্তরটি লিখুন"
                  className={inputClass}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-light active:scale-95 text-white font-bold h-12 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  t("verify")
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-text-muted text-sm hover:underline py-2 touch-manipulation"
              >
                {t("back_step1")}
              </button>
            </form>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-5">
              <h2 className="text-lg font-semibold text-text-primary lg:hidden">{t("step3_title")}</h2>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {t("new_password")}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="নতুন পাসওয়ার্ড (অন্তত ৮ অক্ষর)"
                    className={`${inputClass} pr-12`}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 touch-manipulation"
                    aria-label={showNewPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {t("confirm")}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="নিশ্চিত করুন"
                    className={`${inputClass} pr-12`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 touch-manipulation"
                    aria-label={showConfirmPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-light active:scale-95 text-white font-bold h-12 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  t("reset_btn")
                )}
              </button>
            </form>
          )}

          {/* Back to login */}
          <div className="mt-8 text-center pt-6 border-t border-border">
            <Link
              href="/login"
              className="text-primary font-semibold hover:underline flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> {t("back_login")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
