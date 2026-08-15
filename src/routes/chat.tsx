import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MessageSquare, Send, Smile, Paperclip } from "lucide-react";

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
    setMessages(((data || []) as any[]) as Msg[]);
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
    if (error) { alert(error.message); return; }
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
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link to={isSetter ? "/dashboard" : "/organisation"} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <MessageSquare className="h-7 w-7 text-primary" /> 
              Patron <span className="text-primary">Chat</span>
            </h1>
            <p className="mt-1 text-muted-foreground">A shared room for setters and school patrons.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="font-medium">{messages.length} messages</span>
          </div>
        </div>

        <GlowCard className="overflow-hidden border-primary/30 shadow-lg">
          <div className="relative mb-px h-[55vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50">
            {/* Gradient overlay at top */}
            <div className="pointer-events-none sticky top-0 z-10 h-8 bg-gradient-to-b from-background/80 to-transparent" />
            
            {messages.length === 0 && (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 py-8 text-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm text-muted-foreground">Be the first to say hello!</p>
                </div>
              </div>
            )}
            
            <div className="space-y-4 px-2 pb-4 pt-2">
              {messages.map((m, idx) => {
                const mine = m.sender_id === user?.id;
                const showHeader = idx === 0 || messages[idx - 1].sender_id !== m.sender_id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`group relative max-w-[85%] transition-all duration-200 hover:scale-[1.01]`}>
                      {showHeader && !mine && (
                        <div className="mb-1.5 flex items-center gap-2 px-1">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary/40 text-xs font-bold text-primary-foreground">
                            {m.sender_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">{m.sender_name}</span>
                        </div>
                      )}
                      <div
                        className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm backdrop-blur-sm ${
                          mine
                            ? "border-primary/50 bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 shadow-primary/10"
                            : "border-border/60 bg-card/80 shadow-black/5"
                        }`}
                      >
                        {!mine && showHeader && (
                          <div className="absolute -left-3 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary/40 text-xs font-bold text-primary-foreground shadow-md">
                            {m.sender_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className={`mb-2 text-xs font-medium uppercase tracking-wide ${
                          mine ? "text-primary/80" : "text-muted-foreground/70"
                        }`}>
                          {m.sender_role} • {new Date(m.created_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Gradient overlay at bottom */}
            <div ref={bottomRef} className="sticky bottom-0 h-8 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
          
          {/* Input area with gradient border effect */}
          <div className="relative border-t border-border/50 bg-background/50 p-4 backdrop-blur-sm">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="flex gap-3">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="Write a message... (Enter to send, Shift+Enter for new line)"
                className="min-h-[60px] resize-none rounded-xl border-border/60 bg-card/80 focus:border-primary/70 focus:ring-primary/20"
              />
              <Button 
                variant="neon" 
                onClick={send} 
                disabled={sending || !body.trim()}
                className="h-auto min-w-[50px] rounded-xl px-4 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send className={`h-4 w-4 transition-transform ${sending ? "" : "group-hover:translate-x-0.5"}`} />
              </Button>
            </div>
          </div>
        </GlowCard>
      </main>
    </HoneycombLayout>
  );
}