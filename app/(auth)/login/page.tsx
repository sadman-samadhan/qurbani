"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Logo from "@/components/ui/Logo";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const email = `${formData.phone}@qurbanisathi.com`;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("ভুল নম্বর বা পাসওয়ার্ড। আবার চেষ্টা করুন।");
        }
        throw error;
      }

      toast.success("লগইন সফল হয়েছে!");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t("phone")}
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
              {t("password")}
            </label>
            <input
              type="password"
              required
              placeholder="আপনার পাসওয়ার্ড দিন"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 h-12"
          >
            {loading ? (
              <div className="scale-50">
                <LoadingSpinner size={32} className="!gap-0 !flex-row !text-white" />
              </div>
            ) : (
              t("login")
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center space-y-4">
          <Link
            href="/forgot-password"
            className="block text-sm text-primary hover:underline"
          >
            {t("forgot_password")}
          </Link>
          <div className="pt-6 border-t border-border">
            <p className="text-text-muted text-sm">
              {t("no_account")}{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                {t("register_now")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
