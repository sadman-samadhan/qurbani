"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Logo from "@/components/ui/Logo";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [loading, setLoading] = useState(false);
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

    // Validation
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

      // 1. Create Supabase Auth User
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

      // 2. Update Profile with extra info
      // Note: The profile row is auto-created by the DB trigger
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-warm p-8 border border-border">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Logo width={60} height={60} className="scale-110 mb-4" />
          <p className="text-text-muted text-sm font-medium mt-2">
            {t("tagline")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t("full_name")}
            </label>
            <input
              type="text"
              placeholder="আপনার নাম (ঐচ্ছিক)"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t("phone")} <span className="text-error">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="01XXXXXXXXX"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t("password")} <span className="text-error">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="পাসওয়ার্ড দিন"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t("confirm_password")} <span className="text-error">*</span>
            </label>
            <input
              type="password"
              required
              placeholder="পাসওয়ার্ড নিশ্চিত করুন"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>

          {/* Security Question */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t("security_question")} <span className="text-error">*</span>
            </label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white"
              value={formData.securityQuestion}
              onChange={(e) => setFormData({ ...formData, securityQuestion: e.target.value })}
            >
              <option value="আপনার মায়ের নাম কী?">আপনার মায়ের নাম কী?</option>
              <option value="আপনার প্রাথমিক বিদ্যালয়ের নাম কী?">আপনার প্রাথমিক বিদ্যালয়ের নাম কী?</option>
              <option value="আপনার শৈশবের বন্ধুর নাম কী?">আপনার শৈশবের বন্ধুর নাম কী?</option>
              <option value="আপনার জন্মশহরের নাম কী?">আপনার জন্মশহরের নাম কী?</option>
            </select>
          </div>

          {/* Security Answer */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t("security_answer")} <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="উত্তর লিখুন"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              value={formData.securityAnswer}
              onChange={(e) => setFormData({ ...formData, securityAnswer: e.target.value })}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <div className="scale-50">
                <LoadingSpinner size={32} className="!gap-0 !flex-row !text-white" />
              </div>
            ) : (
              t("register")
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center space-y-4">
          <p className="text-text-muted text-sm">
            {t("have_account")}{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              {t("login")}
            </Link>
          </p>
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-text-muted italic">
              {t("privacy_note")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
