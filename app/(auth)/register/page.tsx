"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Logo from "@/components/ui/Logo";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    password: "",
    confirmPassword: "",
    securityQuestion: "আপনার মায়ের নাম কী?",
    securityAnswer: "",
  });

  const validatePhone = (phone: string) => {
    return /^01\d{9}$/.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhone(formData.phone)) {
      toast.error("সঠিক ফোন নম্বর দিন (০১৮XXXXXXXX)");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("পাসওয়ার্ড দুটি মেলেনি");
      return;
    }
    if (!formData.securityAnswer.trim()) {
      toast.error("নিরাপত্তা প্রশ্নের উত্তর দিন");
      return;
    }

    setLoading(true);

    try {
      const email = `${formData.phone}@qurbanisathi.com`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            phone: formData.phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("নিবন্ধনে সমস্যা হয়েছে");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName || null,
          security_question: formData.securityQuestion,
          security_answer: formData.securityAnswer.toLowerCase().trim(),
        })
        .eq("id", authData.user.id);

      if (profileError) throw profileError;

      toast.success("নিবন্ধন সফল হয়েছে!");
      router.push("/setup-location");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "নিবন্ধনে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 h-12 text-base rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white";

  return (
    <div className="min-h-screen lg:flex">
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
          <p className="text-white/80 text-lg leading-relaxed">{t("tagline")}</p>

          <div className="mt-10 space-y-4 text-left w-full">
            {["সম্পূর্ণ বিনামূল্যে", "২ কিমি এলাকায় প্রতিবেশী খুঁজুন", "নিরাপদ ও সুরক্ষিত"].map(
              (item) => (
                <div key={item} className="flex items-center gap-3 text-white/90">
                  <span className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
                    ✓
                  </span>
                  <span>{item}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Right form panel — scrollable */}
      <div className="flex-1 flex justify-center p-6 py-10 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 text-center lg:hidden">
            <Logo width={60} height={60} className="scale-110 mb-4" />
            <p className="text-text-muted text-sm font-medium mt-2">{t("tagline")}</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-text-primary">নতুন অ্যাকাউন্ট খুলুন</h2>
            <p className="text-text-muted mt-1">আপনার তথ্য দিয়ে নিবন্ধন করুন</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* — Personal Info — */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                ব্যক্তিগত তথ্য
              </p>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {t("full_name")}
                </label>
                <input
                  type="text"
                  placeholder="আপনার নাম (ঐচ্ছিক)"
                  className={inputClass}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {t("phone")} <span className="text-error">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  className={inputClass}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <p className="text-xs text-text-muted mt-1">
                  বাংলাদেশী নম্বর: ০১ দিয়ে শুরু, ১১ সংখ্যা
                </p>
              </div>
            </div>

            {/* — Account Security — */}
            <div className="space-y-4 pt-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                অ্যাকাউন্ট সুরক্ষা
              </p>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {t("password")} <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="পাসওয়ার্ড দিন (অন্তত ৮ অক্ষর)"
                    className={`${inputClass} pr-12`}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 touch-manipulation"
                    aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {t("confirm_password")} <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="পাসওয়ার্ড নিশ্চিত করুন"
                    className={`${inputClass} pr-12`}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
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
            </div>

            {/* — Recovery — */}
            <div className="space-y-4 pt-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                পাসওয়ার্ড পুনরুদ্ধার
              </p>

              {/* Security Question */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {t("security_question")} <span className="text-error">*</span>
                </label>
                <select
                  className={inputClass}
                  value={formData.securityQuestion}
                  onChange={(e) =>
                    setFormData({ ...formData, securityQuestion: e.target.value })
                  }
                >
                  <option value="আপনার মায়ের নাম কী?">আপনার মায়ের নাম কী?</option>
                  <option value="আপনার প্রাথমিক বিদ্যালয়ের নাম কী?">
                    আপনার প্রাথমিক বিদ্যালয়ের নাম কী?
                  </option>
                  <option value="আপনার শৈশবের বন্ধুর নাম কী?">
                    আপনার শৈশবের বন্ধুর নাম কী?
                  </option>
                  <option value="আপনার জন্মশহরের নাম কী?">আপনার জন্মশহরের নাম কী?</option>
                </select>
              </div>

              {/* Security Answer */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {t("security_answer")} <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="উত্তর লিখুন"
                  className={inputClass}
                  value={formData.securityAnswer}
                  onChange={(e) => setFormData({ ...formData, securityAnswer: e.target.value })}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-light active:scale-95 text-white font-bold h-12 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                t("register")
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 text-center space-y-4">
            <p className="text-text-muted text-sm">
              {t("have_account")}{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                {t("login")}
              </Link>
            </p>
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-text-muted italic">{t("privacy_note")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
