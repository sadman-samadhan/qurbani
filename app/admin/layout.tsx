import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import Link from "next/link";
import { 
  LayoutDashboard, 
  ListOrdered, 
  Users, 
  Flag, 
  Settings, 
  LogOut,
  Menu
} from "lucide-react";
import Logo from "@/components/ui/Logo";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Listings", href: "/admin/listings", icon: <ListOrdered className="w-5 h-5" /> },
    { label: "Users", href: "/admin/users", icon: <Users className="w-5 h-5" /> },
    { label: "Reports", href: "/admin/reports", icon: <Flag className="w-5 h-5" /> },
    { label: "Settings", href: "/admin/settings", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-hind">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#0F3D22] text-white">
        <div className="p-6">
          <Logo className="invert brightness-0" />
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-white/10"
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link 
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Exit Admin</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4 lg:hidden">
            <Menu className="w-6 h-6 text-text-primary" />
            <h1 className="font-bold text-primary">Admin Panel</h1>
          </div>
          <div className="hidden lg:block">
            <h2 className="text-sm font-semibold text-text-muted">Admin Panel — QurbaniSathi</h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">A</div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden h-16 bg-white border-t border-border flex items-center justify-around px-2 flex-shrink-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 text-[10px] text-text-muted font-bold uppercase tracking-tight"
            >
              <div className="p-1 rounded-lg hover:bg-primary/5 transition-all">
                {item.icon}
              </div>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
