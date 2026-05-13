import Link from "next/link";
import { Search, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background font-hind">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-warm p-8 text-center border border-border">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
          <Search className="w-10 h-10 text-primary" />
          <span className="absolute top-0 right-0 text-4xl">🔍</span>
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">404 - Not Found</h1>
        <p className="text-text-muted mb-8 italic">পৃষ্ঠাটি পাওয়া যায়নি</p>
        
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
          >
            <Home className="w-5 h-5" /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
