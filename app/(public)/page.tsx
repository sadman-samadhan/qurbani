"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin, Beef, Users, Map as MapIcon,
  MessageSquare, ChevronRight, Timer, Heart
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useTranslations } from "next-intl";

const EID_DATE = process.env.NEXT_PUBLIC_EID_DATE || "2026-05-27T00:00:00";

export default function LandingPage() {
  const t = useTranslations("landing");
  const ta = useTranslations("auth");
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(EID_DATE).getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen font-hind bg-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] bg-gradient-to-br from-[#1B6B3A] to-[#0F3D22] text-white flex flex-col items-center justify-center px-6 pt-20 pb-32 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl flex flex-col items-center">
          <Logo
            width={120}
            height={120}
            showText={false}
            className="mb-6 animate-in zoom-in duration-700"
          />
          <h1 className="text-6xl md:text-8xl font-bold mb-4 tracking-tighter animate-in fade-in slide-in-from-top duration-700">
            QurbaniSathi
          </h1>
          <h2 className="text-3xl md:text-5xl font-semibold text-accent mb-10 drop-shadow-sm">
            কোরবানি সাথী
          </h2>

          <div className="space-y-2 mb-12">
            <p className="text-xl md:text-2xl font-medium opacity-90">
              {t("tagline_en")}
            </p>
            <p className="text-lg md:text-xl text-accent/90">
              {t("tagline_bn")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="w-full sm:w-auto px-10 py-4 bg-accent text-[#0F3D22] font-bold rounded-2xl text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20"
            >
              {t("register_cta")}
            </Link>
            <Link
              href="/map"
              className="w-full sm:w-auto px-10 py-4 border-2 border-white/30 text-white font-bold rounded-2xl text-lg hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              {t("browse_map")}
            </Link>
          </div>

          {/* Countdown Timer */}
          <div className="bg-black/20 backdrop-blur-md rounded-3xl p-6 md:p-8 inline-flex flex-col items-center border border-white/10">
            <p className="text-accent text-xs font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Timer className="w-4 h-4" /> {t("countdown_label")}
            </p>
            <div className="flex gap-4 md:gap-8">
              <TimerUnit value={timeLeft.days} label={t("days")} />
              <TimerUnit value={timeLeft.hours} label={t("hours")} />
              <TimerUnit value={timeLeft.minutes} label={t("mins")} />
              <TimerUnit value={timeLeft.seconds} label={t("secs")} />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            {t("how_title")}
          </h3>
          <div className="w-20 h-1.5 bg-primary mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StepCard
            icon={<MapPin className="w-8 h-8 text-primary" />}
            title={t("step1_title")}
            desc={t("step1_desc")}
          />
          <StepCard
            icon={<Beef className="w-8 h-8 text-primary" />}
            title={t("step2_title")}
            desc={t("step2_desc")}
          />
          <StepCard
            icon={<Users className="w-8 h-8 text-primary" />}
            title={t("step3_title")}
            desc={t("step3_desc")}
          />
        </div>
      </section>

      {/* Why QurbaniSathi Section */}
      <section className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
              {t("why_title")}
            </h3>
            <div className="w-20 h-1.5 bg-accent mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Heart className="w-6 h-6 text-white" />}
              title={t("free")}
              color="bg-primary"
            />
            <FeatureCard
              icon={<MapIcon className="w-6 h-6 text-white" />}
              title={t("radius")}
              color="bg-accent"
            />
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6 text-white" />}
              title={t("whatsapp")}
              color="bg-[#25D366]"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F3D22] text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">
            <div className="max-w-xs">
              <Logo className="mb-4" />
              <p className="opacity-70 text-sm leading-relaxed">
                {t("tagline_en")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-4">
                <p className="font-bold text-accent">{t("quick_links")}</p>
                <ul className="space-y-2 opacity-70 text-sm">
                  <li><Link href="/map" className="hover:text-accent transition-colors">{t("browse_map")}</Link></li>
                  <li><Link href="/login" className="hover:text-accent transition-colors">{ta("login")}</Link></li>
                  <li><Link href="/register" className="hover:text-accent transition-colors">{ta("register")}</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <p className="font-bold text-accent">{t("support")}</p>
                <ul className="space-y-2 opacity-70 text-sm">
                  <li><Link href="#" className="hover:text-accent transition-colors">{t("privacy_policy")}</Link></li>
                  <li><Link href="#" className="hover:text-accent transition-colors">{t("contact")}</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs opacity-50">
            <p>{t("copyright")}</p>
            <p className="flex items-center gap-1">
              {t("made_with_love")}
            </p>
          </div>
        </div>
      </footer>

      {/* Floating CTA - Mobile */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-6">
        <Link
          href="/map"
          className="w-full bg-accent text-[#0F3D22] font-bold py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
        >
          {t("browse_map")} <ChevronRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

function TimerUnit({ value, label }: { value: number, label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl md:text-5xl font-black text-accent tabular-nums">
        {value.toString().padStart(2, "0")}
      </span>
      <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-60">
        {label}
      </span>
    </div>
  );
}

function StepCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group bg-white p-8 rounded-3xl border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="text-xl font-bold text-text-primary mb-4">{title}</h4>
      <p className="text-text-muted text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureCard({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shadow-lg flex-shrink-0`}>
        {icon}
      </div>
      <h4 className="font-bold text-text-primary leading-tight">{title}</h4>
    </div>
  );
}
