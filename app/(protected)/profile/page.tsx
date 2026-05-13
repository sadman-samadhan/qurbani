"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, User, Phone, MapPin, Globe, Lock, 
  LogOut, Check, Edit2, ChevronRight, X
} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// Dynamic import for Leaflet map to prevent SSR issues
const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-background flex items-center justify-center">
      <LoadingSpinner size={24} className="!gap-0" />
    </div>
  ),
});

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);

  const [lang, setLang] = useState("bn");
  
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
    const savedLang = localStorage.getItem("language") || "bn";
    setLang(savedLang);
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      setProfile(profile);
      setNewName(profile.full_name || "");
    }
    setLoading(false);
  };

  const handleUpdateName = async () => {
    setUpdatingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: newName })
        .eq("id", profile.id);

      if (error) throw error;
      setProfile({ ...profile, full_name: newName });
      setIsEditingName(false);
      toast.success("নাম পরিবর্তন করা হয়েছে");
    } catch (err) {
      toast.error("নাম পরিবর্তন করতে সমস্যা হয়েছে");
    } finally {
      setUpdatingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error("নতুন পাসওয়ার্ড দুটি মেলেনি");
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new
      });
      if (error) throw error;
      toast.success("পাসওয়ার্ড পরিবর্তন করা হয়েছে");
      setPasswordForm({ current: "", new: "", confirm: "" });
    } catch (err: any) {
      toast.error(err.message || "পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const toggleLanguage = () => {
    const nextLang = lang === "en" ? "bn" : "en";
    setLang(nextLang);
    localStorage.setItem("language", nextLang);
    toast.success(nextLang === "en" ? "Language set to English" : "ভাষা বাংলা করা হয়েছে");
  };

  const maskPhone = (phone: string) => {
    if (!phone) return "";
    return phone.replace(/^(\d{3})\d{4}(\d{3})$/, "$1****$2");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner />
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-hind pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-border sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-background rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-text-primary" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          Profile / প্রোফাইল
        </h1>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-6">
        {/* Section 1: Identity */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 overflow-hidden">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border-4 border-white shadow-md text-3xl font-bold text-primary mb-4">
              {profile.full_name ? profile.full_name[0] : "?"}
            </div>
            
            <div className="w-full text-center">
              {isEditingName ? (
                <div className="flex items-center gap-2 max-w-xs mx-auto">
                  <input 
                    className="flex-1 px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
                  <button 
                    onClick={handleUpdateName}
                    disabled={updatingName}
                    className="p-2 bg-primary text-white rounded-xl"
                  >
                    {updatingName ? (
                      <div className="scale-50">
                        <LoadingSpinner size={24} className="!gap-0 !flex-row !text-white" />
                      </div>
                    ) : <Check className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setIsEditingName(false)} className="p-2 bg-background rounded-xl">
                    <X className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">
                    {profile.full_name || "Add Name"}
                  </h2>
                  <button onClick={() => setIsEditingName(true)} className="p-1 hover:bg-background rounded-lg text-text-muted transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-text-muted mt-1 text-sm">
                <Phone className="w-3 h-3" />
                {maskPhone(profile.phone)}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Location */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Location / অবস্থান
          </h3>
          <div className="flex gap-4 items-center bg-background p-3 rounded-2xl border border-border">
            <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden">
              {profile?.latitude && profile?.longitude ? (
                <LeafletMap 
                  center={{ lat: profile.latitude, lng: profile.longitude }}
                  markers={[{ lat: profile.latitude, lng: profile.longitude }]}
                  zoom={12}
                />
              ) : (
                <div className="w-full h-full bg-white flex items-center justify-center border border-border rounded-xl">
                   <MapPin className="w-6 h-6 text-border" />
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-sm text-text-primary truncate">{profile.area_name || "Not set"}</p>
              <button 
                onClick={() => router.push("/setup-location")}
                className="mt-2 text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                Update Location <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Language */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Language / ভাষা
          </h3>
          <button 
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between p-4 bg-background rounded-2xl border border-border hover:border-primary transition-all group"
          >
            <span className="font-bold text-text-primary">
              {lang === "en" ? "English" : "বাংলা"}
            </span>
            <div className={`w-14 h-8 rounded-full transition-all relative ${lang === "en" ? "bg-primary" : "bg-accent"}`}>
               <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${lang === "en" ? "left-1" : "left-7"}`} />
            </div>
          </button>
        </div>

        {/* Section 4: Security */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Security / নিরাপত্তা
          </h3>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <input 
              type="password"
              placeholder="নতুন পাসওয়ার্ড"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none"
              value={passwordForm.new}
              onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
              required
            />
            <input 
              type="password"
              placeholder="পাসওয়ার্ড নিশ্চিত করুন"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              required
            />
            <button 
              disabled={updatingPassword}
              className="w-full py-3 bg-background text-text-primary font-bold rounded-xl border border-border hover:bg-border transition-all flex items-center justify-center gap-2 h-12"
            >
              {updatingPassword ? (
                <div className="scale-50">
                  <LoadingSpinner size={24} className="!gap-0 !flex-row" />
                </div>
              ) : "Change Password"}
            </button>
          </form>
        </div>

        {/* Section 5: Logout */}
        <button 
          onClick={handleLogout}
          className="w-full py-4 border-2 border-error text-error rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-error/5 transition-all mb-10"
        >
          <LogOut className="w-5 h-5" /> Logout / লগআউট
        </button>
      </div>
    </div>
  );
}
