"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Globe } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslations, useLocale } from "next-intl";
import { setLocale } from "@/app/actions/locale";

type RawMessage = {
  id: string;
  content: string;
  created_at: string;
  read: boolean;
  request_id: string | null;
  sender_id: string;
  receiver_id: string;
};

type Profile = { id: string; full_name: string | null };
type ShareRequestInfo = { id: string; shares_wanted: number; area_name: string | null };

type Conversation = {
  key: string;
  requestId: string | null;
  otherUserId: string;
  otherUserName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  sharesWanted: number | null;
  areaName: string | null;
};

export default function MessagesPage() {
  const router = useRouter();
  const tc = useTranslations("chat");
  const locale = useLocale();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLangToggle = async () => {
    const next = locale === "en" ? "bn" : "en";
    await setLocale(next);
    router.refresh();
  };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setCurrentUserId(user.id);
      await fetchConversations(user.id);
    }
    init();
  }, [router]);

  const fetchConversations = async (userId: string) => {
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, content, created_at, read, request_id, sender_id, receiver_id")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!msgs || msgs.length === 0) {
      setLoading(false);
      return;
    }

    const otherUserIds = [...new Set(
      msgs.map(m => m.sender_id === userId ? m.receiver_id : m.sender_id)
    )];
    const requestIds = [...new Set(
      msgs.filter(m => m.request_id).map(m => m.request_id as string)
    )];

    const [profilesRes, requestsRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", otherUserIds),
      requestIds.length > 0
        ? supabase.from("share_requests").select("id, shares_wanted, area_name").in("id", requestIds)
        : Promise.resolve({ data: [] as ShareRequestInfo[] }),
    ]);

    const profileMap = new Map<string, Profile>(
      (profilesRes.data || []).map(p => [p.id, p])
    );
    const requestMap = new Map<string, ShareRequestInfo>(
      ((requestsRes as any).data || []).map((r: ShareRequestInfo) => [r.id, r])
    );

    const convMap = new Map<string, Conversation>();
    for (const msg of msgs as RawMessage[]) {
      const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const key = `${msg.request_id ?? "no-req"}:${otherUserId}`;

      if (!convMap.has(key)) {
        const otherProfile = profileMap.get(otherUserId);
        const sr = msg.request_id ? requestMap.get(msg.request_id) : null;
        convMap.set(key, {
          key,
          requestId: msg.request_id,
          otherUserId,
          otherUserName: otherProfile?.full_name || "Anonymous",
          lastMessage: msg.content,
          lastMessageAt: msg.created_at,
          unreadCount: 0,
          sharesWanted: sr?.shares_wanted ?? null,
          areaName: sr?.area_name ?? null,
        });
      }

      if (msg.receiver_id === userId && !msg.read) {
        convMap.get(key)!.unreadCount++;
      }
    }

    setConversations(
      Array.from(convMap.values()).sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      )
    );
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background font-hind">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-xl hover:bg-background transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">{tc("title")}</h1>
        </div>
        <button
          onClick={handleLangToggle}
          className="flex items-center gap-1 text-sm font-bold text-text-muted hover:text-primary"
        >
          <Globe className="w-4 h-4" />
          {locale === "en" ? "বাংলা" : "EN"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-4">
            <MessageCircle className="w-16 h-16 text-border" />
            <div>
              <p className="font-bold text-text-primary text-lg mb-1">{tc("no_conversations")}</p>
              <p className="text-text-muted text-sm">{tc("no_conversations_hint")}</p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-2 bg-primary text-white px-6 py-2.5 rounded-2xl font-bold text-sm"
            >
              {tc("browse_map")}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map(conv => (
              <ConversationCard
                key={conv.key}
                conv={conv}
                locale={locale}
                tc={tc}
                onClick={() => {
                  if (conv.requestId) {
                    router.push(`/messages/${conv.requestId}/${conv.otherUserId}`);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationCard({
  conv,
  locale,
  tc,
  onClick,
}: {
  conv: Conversation;
  locale: string;
  tc: ReturnType<typeof useTranslations>;
  onClick: () => void;
}) {
  const initial = conv.otherUserName[0]?.toUpperCase() || "?";
  const subtitle =
    conv.sharesWanted && conv.areaName
      ? tc("re_listing", { shares: conv.sharesWanted, area: conv.areaName.split(",")[0] })
      : conv.areaName || "";

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-4 flex items-center gap-3 hover:bg-background/80 transition-colors text-left"
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-lg font-bold text-primary">{initial}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-bold text-text-primary text-sm truncate">{conv.otherUserName}</span>
          <span className="text-[10px] text-text-muted ml-2 flex-shrink-0">
            {formatDistanceToNow(new Date(conv.lastMessageAt))}
          </span>
        </div>
        {subtitle && (
          <p className="text-[11px] text-primary font-semibold mb-0.5 truncate">{subtitle}</p>
        )}
        <p className="text-xs text-text-muted truncate">{conv.lastMessage}</p>
      </div>

      {conv.unreadCount > 0 && (
        <span className="flex-shrink-0 bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
        </span>
      )}
    </button>
  );
}
