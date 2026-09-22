import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { ChatSurface } from "@/components/chat/ChatSurface";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatAppearanceButton } from "@/components/chat/ChatAppearanceButton";
import { useChatAppearance } from "@/hooks/useChatAppearance";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Setter & Patron Chat | CodeRace" },
      { name: "description", content: "A shared room where school patrons and setters coordinate curriculum, quizzes and learner progress." },
      { property: "og:title", content: "Setter & Patron Chat | CodeRace" },
      { property: "og:description", content: "Coordinate curriculum and learner progress with setters and fellow patrons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

interface Msg {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  body: string;
  created_at: string;
}

function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const { isSetter, isPatron, loading: roleLoading } = useUserRole();
  const { prefs, update } = useChatAppearance();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || roleLoading) return;
    if (!isSetter && !isPatron) { navigate({ to: "/learn" }); return; }
    load();
    const channel = supabase
      .channel("chat_messages_room")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roleLoading, isSetter, isPatron]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(300);
    setMessages(((data || []) as unknown[]) as Msg[]);
    setLoading(false);
  };

  const send = async () => {
    if (!body.trim() || !user) return;
    setSending(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("user_id", user.id)
      .maybeSingle();
    const { error } = await supabase.from("chat_messages").insert({
      sender_id: user.id,
      sender_name: profile?.display_name || profile?.email || user.email || "Unknown",
      sender_role: isSetter ? "setter" : "patron",
      body: body.trim(),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setBody("");
  };

  if (authLoading || roleLoading || loading) {
    return (
      <HoneycombLayout>
        <Navbar />
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </HoneycombLayout>
    );
  }

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to={isSetter ? "/dashboard" : "/organisation"} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <MessageSquare className="h-7 w-7 text-primary" /> Patron <span className="text-primary">Chat</span>
        </h1>
        <p className="mb-6 text-muted-foreground">A shared room for setters and school patrons.</p>

        <ChatSurface prefs={prefs} className="min-h-[62vh]">
          <header className="chat-header">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold chat-strong">Setters &amp; patrons</p>
              <p className="truncate text-xs chat-dim">{messages.length} messages in this room</p>
            </div>
            <ChatAppearanceButton prefs={prefs} onChange={update} />
          </header>

          <div className="chat-scroll">
            {messages.length === 0 && (
              <p className="py-10 text-center text-sm chat-dim">No messages yet. Say hello.</p>
            )}
            {messages.map((m) => (
              <ChatBubble
                key={m.id}
                mine={m.sender_id === user?.id}
                name={m.sender_name}
                meta={<span className="chat-chip">{m.sender_role}</span>}
                time={new Date(m.created_at).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              >
                <span className="whitespace-pre-wrap">{m.body}</span>
              </ChatBubble>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="chat-composer">
            <div className="flex items-end gap-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
                }}
                placeholder="Write a message… (Enter to send)"
                className="chat-input min-h-[56px]"
                aria-label="Message"
              />
              <button type="button" onClick={send} disabled={sending || !body.trim()} aria-label="Send message" className="chat-send">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </ChatSurface>
      </main>
    </HoneycombLayout>
  );
}
