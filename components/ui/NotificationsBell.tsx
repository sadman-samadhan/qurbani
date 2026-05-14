"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Bell, Check, X, UserPlus, MessageSquare, 
  CheckCircle2, XCircle, Ban, PartyPopper 
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  created_at: string;
}

export default function NotificationsBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    // Close on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) await markAsRead(n.id);
    setIsOpen(false);

    const { request_id, applicant_id, sender_id } = n.data || {};

    switch (n.type) {
      case "join_request":
        router.push(`/notifications/approve?request_id=${request_id}&applicant_id=${applicant_id}`);
        break;
      case "join_approved":
      case "member_joined":
        router.push("/dashboard");
        break;
      case "listing_message":
        router.push(`/messages/${request_id}/${sender_id}`);
        break;
      case "join_rejected":
      case "join_cancelled":
        router.push("/my-requests");
        break;
      default:
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "join_request": return <UserPlus className="w-4 h-4 text-amber-500" />;
      case "join_approved": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "join_rejected": return <XCircle className="w-4 h-4 text-error" />;
      case "join_cancelled": return <Ban className="w-4 h-4 text-text-muted" />;
      case "listing_message": return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "member_joined": return <PartyPopper className="w-4 h-4 text-green-600" />;
      default: return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className={`w-6 h-6 ${isOpen ? "text-primary" : "text-text-primary"}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-border z-[5000] overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-text-muted">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs italic">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 border-b border-border last:border-0 cursor-pointer transition-colors relative ${
                    n.read ? "bg-[#FFFDF5]" : "bg-white border-l-4 border-l-primary"
                  } hover:bg-gray-50`}
                >
                  <div className="flex gap-3">
                    <div className="mt-1">{getIcon(n.type)}</div>
                    <div className="flex-1">
                      <p className={`text-xs ${n.read ? "font-medium" : "font-bold"} text-text-primary mb-0.5`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                      <p className="text-[9px] text-text-muted mt-2 font-medium">
                        {formatDistanceToNow(new Date(n.created_at))} ago
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 text-center border-t border-border">
              <Link
                href="/notifications"
                className="text-[11px] font-bold text-primary hover:underline"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
