"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Send, Globe, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslations, useLocale } from "next-intl";
import { setLocale } from "@/app/actions/locale";

type Message = {
  id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender_id: string;
  receiver_id: string;
  request_id: string | null;
};

type ShareRequest = {
  id: string;
  shares_wanted: number;
  area_name: string | null;
  status: string;
} | null;

export default function ThreadPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.requestId as string;
  const otherUserId = params.userId as string;

  const tc = useTranslations("chat");
  const locale = useLocale();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUserName, setOtherUserName] = useState<string>("");
  const [shareRequest, setShareRequest] = useState<ShareRequest>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const handleLangToggle = async () => {
    const next = locale === "en" ? "bn" : "en";
    await setLocale(next);
    router.refresh();
  };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Guard: cannot message yourself
      if (user.id === otherUserId) { router.back(); return; }

      setCurrentUserId(user.id);
      await fetchData(user.id);
    }
    init();
  }, [requestId, otherUserId]);

  const fetchData = async (userId: string) => {
    const [msgsRes, profileRes, srRes] = await Promise.all([
      supabase
        .from("messages")
        .select("id, content, created_at, read, sender_id, receiver_id, request_id")
        .eq("request_id", requestId)
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),` +
          `and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("id, full_name").eq("id", otherUserId).single(),
      supabase.from("share_requests").select("id, shares_wanted, area_name, status").eq("id", requestId).maybeSingle(),
    ]);

    setMessages((msgsRes.data as Message[]) || []);
    setOtherUserName(profileRes.data?.full_name || "User");
    setShareRequest(srRes.data);
    setLoading(false);

    // Mark unread messages as read
    const unreadIds = ((msgsRes.data as Message[]) || [])
      .filter(m => m.receiver_id === userId && !m.read)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase.from("messages").update({ read: true }).in("id", unreadIds);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`thread:${requestId}:${[currentUserId, otherUserId].sort().join(":")}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
        (payload: any) => {
          const newMsg = payload.new as Message;
          const isForUs =
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === otherUserId) ||
            (newMsg.sender_id === otherUserId && newMsg.receiver_id === currentUserId);

          if (!isForUs) return;

          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            // Replace the optimistic temp entry for messages I sent
            if (newMsg.sender_id === currentUserId) {
              const tempIdx = prev.findIndex(
                m => m.id.startsWith("temp-") && m.content === newMsg.content
              );
              if (tempIdx !== -1) {
                const next = [...prev];
                next[tempIdx] = newMsg;
                return next;
              }
            }
            return [...prev, newMsg];
          });

          if (newMsg.receiver_id === currentUserId) {
            supabase.from("messages").update({ read: true }).eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, requestId, otherUserId]);

  const sendMessage = async () => {
    if (!input.trim() || !currentUserId || sending) return;

    const content = input.trim();
    setInput("");
    setSending(true);

    // Optimistic UI
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      read: false,
      sender_id: currentUserId,
      receiver_id: otherUserId,
      request_id: requestId,
    };
    setMessages(prev => [...prev, tempMsg]);

    const { error } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      receiver_id: otherUserId,
      request_id: requestId,
      content,
      read: false,
    });

    setSending(false);

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error(tc("error_send"));
    }
    // Realtime echo will replace the temp message with the real one
  };

  const listingExpired = shareRequest !== null && shareRequest?.status !== "open";

  const subtitle = shareRequest
    ? locale === "en"
      ? `${shareRequest.shares_wanted} shares in ${shareRequest.area_name?.split(",")[0] || ""}`
      : `${shareRequest.area_name?.split(",")[0] || ""}-তে ${shareRequest.shares_wanted} ভাগ`
    : "";

  return (
    <div className="flex flex-col h-screen bg-background font-hind">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-border">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-xl hover:bg-background active:scale-95 transition-all flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary">
            {otherUserName[0]?.toUpperCase() || "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-text-primary text-sm leading-tight truncate">
            {otherUserName}
          </p>
          {subtitle && (
            <p className="text-[11px] text-text-muted truncate">{subtitle}</p>
          )}
        </div>
        <button
          onClick={handleLangToggle}
          className="flex items-center gap-1 text-sm font-bold text-text-muted hover:text-primary active:scale-95 transition-all flex-shrink-0"
        >
          <Globe className="w-4 h-4" />
          {locale === "en" ? "বাংলা" : "EN"}
        </button>
      </div>

      {/* Expired listing banner */}
      {listingExpired && (
        <div className="bg-amber-50 border-b-2 border-amber-200 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800 leading-tight">
                {locale === "en"
                  ? "This listing is no longer active"
                  : "এই পোস্টটি আর সক্রিয় নেই"}
              </p>
              <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                {locale === "en"
                  ? "The share request was filled or expired — but you can still continue this conversation."
                  : "এই শেয়ার অনুরোধটি পূর্ণ হয়েছে বা মেয়াদ শেষ — তবে কথোপকথন চালিয়ে যেতে পারবেন।"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <LoadingSpinner />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm text-text-muted text-center px-8">
                {locale === "en"
                  ? "Send your first message about this listing"
                  : "এই পোস্ট নিয়ে প্রথম মেসেজ পাঠান"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map(msg => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? "bg-primary text-white rounded-br-sm"
                          : "bg-white border border-border text-text-primary rounded-bl-sm"
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? "text-white/70" : "text-text-muted"}`}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-end gap-3">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={tc("type_message")}
          className="flex-1 resize-none border border-border rounded-2xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 font-hind max-h-24 bg-background"
          rows={1}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
        </div>
      </div>
    </div>
  );
}
