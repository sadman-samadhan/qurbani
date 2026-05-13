"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background font-hind">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-warm p-8 text-center border border-border">
        <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-error" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Something went wrong!</h1>
        <p className="text-text-muted mb-8 italic">একটি সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।</p>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-opacity-90 transition-all"
          >
            <RefreshCcw className="w-4 h-4" /> Try again
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-border text-text-muted rounded-2xl font-bold hover:bg-background transition-all"
          >
            <Home className="w-4 h-4" /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
