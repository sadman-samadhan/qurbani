import { supabaseAdmin } from "@/lib/supabase/admin";
import { format } from "date-fns";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Trash2, 
  Clock, 
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const page = parseInt(searchParams.page || "1");
  const limit = 20;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const query = searchParams.query || "";
  const status = searchParams.status || "";

  // Fetch listings with filters and pagination
  let dbQuery = supabaseAdmin
    .from("share_requests")
    .select("*, profiles(phone, full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, end);

  if (status) {
    dbQuery = dbQuery.eq("status", status);
  }
  
  if (query) {
    dbQuery = dbQuery.or(`area_name.ilike.%${query}%`);
  }

  const { data: listings, count, error } = await dbQuery;

  const totalPages = Math.ceil((count || 0) / limit);

  const maskPhone = (phone: string) => {
    if (!phone) return "N/A";
    return phone.replace(/^(\d{3})\d{4}(\d{3})$/, "$1****$2");
  };

  return (
    <div className="space-y-6 font-hind">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Listings Management</h1>
          <p className="text-sm text-text-muted">Monitor and moderate all share requests</p>
        </div>
        <button className="bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all">
          Expire All Listings
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row gap-4">
        <form className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input 
            name="query"
            defaultValue={query}
            placeholder="Search by area..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </form>
        <div className="flex gap-4">
          <select 
            className="bg-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            defaultValue={status}
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="filled">Filled</option>
            <option value="expired">Expired</option>
          </select>
          <button className="bg-background border border-border rounded-xl px-4 py-2 text-sm font-bold hover:bg-border transition-all flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-background text-[10px] font-bold uppercase tracking-widest text-text-muted border-b border-border">
                <th className="px-6 py-4">User (Phone)</th>
                <th className="px-6 py-4">Area</th>
                <th className="px-6 py-4">Shares</th>
                <th className="px-6 py-4">Budget</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Posted</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listings?.map((item: any) => (
                <tr key={item.id} className="hover:bg-background/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-text-primary">{item.profiles?.full_name || "Anonymous"}</div>
                    <div className="text-xs text-text-muted">{maskPhone(item.profiles?.phone)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary">
                    {item.area_name?.split(",")[0]}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i < item.shares_wanted ? 'bg-primary' : 'bg-border'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-text-primary">
                    {item.budget ? `৳${item.budget.toLocaleString()}` : "--"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      item.status === 'open' ? 'bg-green-100 text-green-700 border-green-200' : 
                      item.status === 'filled' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                      'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-text-muted">
                    {format(new Date(item.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-primary transition-all">
                        <Clock className="w-4 h-4" title="Expire" />
                      </button>
                      <button className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-rose-600 transition-all">
                        <Trash2 className="w-4 h-4" title="Delete" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {listings?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <p className="text-text-muted italic">No listings found matching filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-background/30">
          <p className="text-xs text-text-muted">
            Showing {start + 1} to {Math.min(end + 1, count || 0)} of {count} listings
          </p>
          <div className="flex gap-2">
            <button disabled={page === 1} className="p-2 border border-border rounded-lg disabled:opacity-30 hover:bg-white transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={page >= totalPages} className="p-2 border border-border rounded-lg disabled:opacity-30 hover:bg-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
