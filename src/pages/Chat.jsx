import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare, Send, ArrowLeft, User } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { getConversations, getMessages, markRead } from "../api/messages.js";
import { assetUrl } from "../api/client.js";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────
const ROUTE_LABELS = {
  NOTUNBAZAR_SAYEDNAGAR_UIU: "Notunbazar → UIU",
  UIU_NOTUNBAZAR: "UIU → Notunbazar",
  UTTORBADDHA_UIU: "Uttorbaddha → UIU",
  UIU_UTTORBADDHA: "UIU → Uttorbaddha",
};

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Avatar({ user, size = "md" }) {
  const sz = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const initials = (user?.fullName || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (user?.avatarUrl) {
    return (
      <img
        src={assetUrl(user.avatarUrl)}
        alt={user.fullName}
        className={`${sz} rounded-full object-cover ring-2 ring-white dark:ring-slate-900`}
      />
    );
  }
  return (
    <div
      className={`${sz} flex items-center justify-center rounded-full bg-brand-600 font-bold text-white`}
    >
      {initials}
    </div>
  );
}

// ── Conversation List ─────────────────────────────────────────────────────────
function ConversationList({ conversations, activeId, onSelect, loading }) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <MessageSquare className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          No conversations yet
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Start chatting by messaging a driver or passenger from your rides.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto">
      {conversations.map((c) => (
        <li key={c.rideRequestId}>
          <button
            type="button"
            onClick={() => onSelect(c)}
            className={[
              "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
              activeId === c.rideRequestId
                ? "bg-brand-50 dark:bg-brand-950/30"
                : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
            ].join(" ")}
          >
            <Avatar user={c.otherUser} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {c.otherUser?.fullName ?? "Unknown"}
                </p>
                <span className="shrink-0 text-xs text-slate-400">
                  {c.lastMessage ? formatTime(c.lastMessage.createdAt) : ""}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {c.lastMessage?.content ?? ROUTE_LABELS[c.ridePost?.routeId] ?? ""}
                </p>
                {c.unreadCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                    {c.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Chat Window ───────────────────────────────────────────────────────────────
function ChatWindow({ conversation, currentUser, onBack }) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const rideRequestId = conversation.rideRequestId;

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setShowScroll(scrollHeight - scrollTop - clientHeight > 100);
  };

  // Load history
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    getMessages(rideRequestId)
      .then((data) => setMessages(data?.messages ?? []))
      .catch(() => toast.error("Failed to load messages"))
      .finally(() => setLoading(false));
  }, [rideRequestId]);

  // Socket: join room + listen
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    s.emit("join_room", rideRequestId);

    const handler = ({ rideRequestId: rid, message }) => {
      if (rid !== rideRequestId) return;
      setMessages((prev) => {
        // avoid duplicates
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      // mark read if window open
      markRead(rideRequestId).catch(() => {});
    };

    s.on("new_message", handler);
    return () => {
      s.emit("leave_room", rideRequestId);
      s.off("new_message", handler);
    };
  }, [rideRequestId, socket]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");

    const s = socket.current;
    if (s?.connected) {
      s.emit("send_message", { rideRequestId, content: text });
      setSending(false);
    } else {
      // Fallback: REST
      import("../api/messages.js")
        .then(({ sendMessage }) => sendMessage(rideRequestId, text))
        .then((data) => {
          setMessages((prev) => [...prev, data.message]);
        })
        .catch(() => toast.error("Failed to send message"))
        .finally(() => setSending(false));
    }
  }, [input, rideRequestId, sending, socket]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const grouped = groupByDate(messages);

  return (
    <div className="flex h-full flex-col relative">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar user={conversation.otherUser} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {conversation.otherUser?.fullName ?? "Unknown"}
          </p>
          <p className="truncate text-xs text-slate-400">
            {ROUTE_LABELS[conversation.ridePost?.routeId] ?? "Ride chat"} ·{" "}
            <span className="capitalize">{conversation.role}</span>
          </p>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 dark:bg-slate-950 relative"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-slate-400">No messages yet.</p>
            <p className="text-xs text-slate-300 dark:text-slate-600">
              Say hello! 👋
            </p>
          </div>
        ) : (
          <>
            {grouped.map(({ date, msgs }) => (
              <div key={date}>
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  <span className="text-[11px] font-medium text-slate-400">{date}</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>
                {msgs.map((msg) => {
                  const isMine = msg.senderId === currentUser?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`mb-2 flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {!isMine && (
                        <div className="shrink-0">
                          <Avatar user={msg.sender} size="sm" />
                        </div>
                      )}
                      <div
                        className={[
                          "max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                          isMine
                            ? "rounded-br-sm bg-brand-600 text-white"
                            : "rounded-bl-sm bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100",
                        ].join(" ")}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p
                          className={[
                            "mt-1 text-right text-[10px]",
                            isMine ? "text-brand-200" : "text-slate-400",
                          ].join(" ")}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {isMine && (
                            <span className="ml-1">{msg.isRead ? "✓✓" : "✓"}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {showScroll && (
        <div className="absolute bottom-20 right-6 z-10">
          <button
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-lg backdrop-blur hover:bg-slate-900 transition-all dark:bg-slate-700/80"
          >
            <ArrowLeft className="h-5 w-5 -rotate-90" />
          </button>
        </div>
      )}

      {/* Input */}
      {["REJECTED", "CANCELLED"].includes(conversation.status) ? (
        <div className="border-t border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            This request has been {conversation.status.toLowerCase()}. Chat is now closed.
          </p>
        </div>
      ) : (
        <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:ring-brand-900">
              <textarea
              id="chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message… (Enter to send)"
              autoFocus
              className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100"
              style={{ maxHeight: "120px" }}
            />
            <button
              type="button"
              id="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-opacity disabled:opacity-40 hover:bg-brand-700"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Date grouping helper ──────────────────────────────────────────────────────
function groupByDate(messages) {
  const map = new Map();
  for (const msg of messages) {
    const d = new Date(msg.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

    if (!map.has(label)) map.set(label, []);
    map.get(label).push(msg);
  }
  return Array.from(map.entries()).map(([date, msgs]) => ({ date, msgs }));
}

// ── Main Chat Page ────────────────────────────────────────────────────────────
export function Chat() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState(null);
  const [showList, setShowList] = useState(true);

  // Load conversations
  useEffect(() => {
    setLoading(true);
    getConversations()
      .then((data) => {
        const convos = data?.conversations ?? [];
        setConversations(convos);

        // Auto-select from URL param
        const rid = searchParams.get("rid");
        if (rid) {
          const found = convos.find((c) => c.rideRequestId === rid);
          if (found) {
            setActiveConversation(found);
            setShowList(false);
          }
        }
      })
      .catch(() => toast.error("Failed to load conversations"))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (conv) => {
    setActiveConversation(conv);
    setShowList(false);
    setSearchParams({ rid: conv.rideRequestId });
    // Optimistically clear unread badge
    setConversations((prev) =>
      prev.map((c) =>
        c.rideRequestId === conv.rideRequestId ? { ...c, unreadCount: 0 } : c
      )
    );
  };

  const handleBack = () => {
    setShowList(true);
    setActiveConversation(null);
    setSearchParams({});
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Sidebar: conversation list */}
      <div
        className={[
          "flex w-full flex-col border-r border-slate-200 dark:border-slate-800 md:w-80 md:flex-shrink-0",
          showList ? "flex" : "hidden md:flex",
        ].join(" ")}
      >
        {/* Header */}
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-brand-600" />
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Messages
            </h1>
          </div>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeConversation?.rideRequestId}
          onSelect={handleSelect}
          loading={loading}
        />
      </div>

      {/* Main chat area */}
      <div
        className={[
          "flex-1",
          !showList ? "flex flex-col" : "hidden md:flex md:flex-col",
        ].join(" ")}
      >
        {activeConversation ? (
          <ChatWindow
            key={activeConversation.rideRequestId}
            conversation={activeConversation}
            currentUser={user}
            onBack={handleBack}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/30">
              <MessageSquare className="h-8 w-8 text-brand-500" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Select a conversation to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
