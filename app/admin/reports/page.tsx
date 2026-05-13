import { supabaseAdmin } from "@/lib/supabase/admin";
import { format } from "date-fns";
import { 
  Flag, 
  Trash2, 
  CheckCircle2, 
  ExternalLink,
  AlertTriangle
} from "lucide-react";

export default async function AdminReportsPage() {
  // Fetch reports with associated listings and reporters
  const { data: reports, error } = await supabaseAdmin
    .from("reports")
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(phone, full_name),
      request:share_requests(id, area_name, status)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 font-hind">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Reports & Moderation</h1>
        <p className="text-sm text-text-muted">Review and act on user reports</p>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-background text-[10px] font-bold uppercase tracking-widest text-text-muted border-b border-border">
                <th className="px-6 py-4">Reporter</th>
                <th className="px-6 py-4">Target Listing</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports?.map((report: any) => (
                <tr key={report.id} className="hover:bg-background/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-text-primary">{report.reporter?.full_name || "User"}</div>
                    <div className="text-xs text-text-muted">{report.reporter?.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary font-medium">
                      {report.request?.area_name?.split(",")[0] || "Unknown Listing"}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                        report.request?.status === 'open' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {report.request?.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-text-primary">{report.reason || "No reason provided"}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-text-muted">
                    {format(new Date(report.created_at), "MMM d, h:mm a")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-primary transition-all">
                        <CheckCircle2 className="w-4 h-4" title="Dismiss" />
                      </button>
                      <button className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-rose-600 transition-all">
                        <Trash2 className="w-4 h-4" title="Delete Listing" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reports?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-10 h-10 text-primary/20" />
                      <p className="text-text-muted">All clear! No reports to review.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
