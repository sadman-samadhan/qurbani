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

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

      {/* Right form panel */}
      <div className="flex-1 flex min-h-screen items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 text-center lg:hidden">
            <Logo width={60} height={60} className="scale-110 mb-4" />
            <p className="text-text-muted text-sm font-medium mt-2">{t("tagline")}</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-text-primary">স্বাগতম!</h2>
            <p className="text-text-muted mt-1">{t("tagline")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                {t("phone")}
              </label>
              <input
                type="tel"
                required
                placeholder="01XXXXXXXXX"
                className="w-full px-4 h-12 text-base rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                {t("password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="আপনার পাসওয়ার্ড দিন"
                  className="w-full px-4 h-12 text-base rounded-xl border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all pr-12"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-light active:scale-95 text-white font-bold h-12 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                t("login")
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 text-center space-y-4">
            <Link href="/forgot-password" className="block text-sm text-primary hover:underline">
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
    </div>
  );
}
