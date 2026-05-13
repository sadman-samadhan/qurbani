import { supabaseAdmin } from "@/lib/supabase/admin";
import { format } from "date-fns";
import { Search, Trash2, ShieldCheck, Mail, MapPin } from "lucide-react";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const page = parseInt(searchParams.page || "1");
  const limit = 20;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const query = searchParams.query || "";

  // Fetch users with counts of their listings
  let dbQuery = supabaseAdmin
    .from("profiles")
    .select(`
      *,
      share_requests(count)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, end);

  if (query) {
    dbQuery = dbQuery.or(`phone.ilike.%${query}%,full_name.ilike.%${query}%`);
  }

  const { data: users, count, error } = await dbQuery;

  const maskPhone = (phone: string) => {
    if (!phone) return "N/A";
    return phone.replace(/^(\d{3})\d{4}(\d{3})$/, "$1****$2");
  };

  return (
    <div className="space-y-6 font-hind">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">User Management</h1>
        <p className="text-sm text-text-muted">Manage platform members and their account status</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
        <form className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input 
            name="query"
            defaultValue={query}
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </form>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-background text-[10px] font-bold uppercase tracking-widest text-text-muted border-b border-border">
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Listings</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users?.map((user: any) => (
                <tr key={user.id} className="hover:bg-background/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                        {user.full_name ? user.full_name[0] : "?"}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-text-primary flex items-center gap-1">
                          {user.full_name || "Guest User"}
                          {user.is_admin && <ShieldCheck className="w-3 h-3 text-primary" />}
                        </div>
                        <div className="text-xs text-text-muted">{maskPhone(user.phone)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                      <MapPin className="w-3 h-3" />
                      {user.area_name?.split(",")[0] || "Not set"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-green-200">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-text-primary">
                      {user.share_requests?.[0]?.count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-text-muted">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-rose-50 rounded-lg text-text-muted hover:text-rose-600 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
