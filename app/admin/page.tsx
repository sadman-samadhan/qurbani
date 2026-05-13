import { supabaseAdmin } from "@/lib/supabase/admin";
import { Users, ClipboardList, CheckCircle2, Flag } from "lucide-react";
import AdminHeatmap from "@/components/admin/heatmap";

export default async function AdminDashboard() {
  // Fetch stats
  const [
    { count: totalUsers },
    { count: activeListings },
    { count: filledListings },
    { count: totalReports },
    { data: heatData }
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("share_requests").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabaseAdmin.from("share_requests").select("*", { count: "exact", head: true }).eq("status", "filled"),
    supabaseAdmin.from("reports").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("share_requests").select("latitude, longitude").eq("status", "open")
  ]);

  const stats = [
    { label: "Total Users", value: totalUsers || 0, icon: <Users className="w-5 h-5" />, color: "bg-blue-500" },
    { label: "Active Listings", value: activeListings || 0, icon: <ClipboardList className="w-5 h-5" />, color: "bg-green-500" },
    { label: "Filled Listings", value: filledListings || 0, icon: <CheckCircle2 className="w-5 h-5" />, color: "bg-amber-500" },
    { label: "Reports", value: totalReports || 0, icon: <Flag className="w-5 h-5" />, color: "bg-rose-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard Overview</h1>
        <p className="text-sm text-text-muted">Real-time platform statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${stat.color} text-white flex items-center justify-center shadow-lg`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-text-primary">{stat.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap Section */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Listings Density</h3>
            <p className="text-sm text-text-muted">Heatmap showing active requests across Bangladesh</p>
          </div>
        </div>
        <div className="h-[500px] w-full rounded-xl overflow-hidden border border-border">
          <AdminHeatmap data={heatData || []} />
        </div>
      </div>
    </div>
  );
}
