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
import { ArrowLeft, MessageSquare, Send } from "lucide-react";

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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to={isSetter ? "/dashboard" : "/organisation"} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <MessageSquare className="h-7 w-7 text-primary" /> Patron <span className="text-primary">Chat</span>
        </h1>
        <p className="mb-6 text-muted-foreground">A shared room for setters and school patrons.</p>

        <GlowCard>
          <div className="mb-4 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg border p-3 ${mine ? "border-primary bg-primary/10" : "border-border bg-background/50"}`}>
                    <p className="mb-1 text-xs text-muted-foreground">
                      {m.sender_name} · <span className="uppercase">{m.sender_role}</span> ·{" "}
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Write a message... (Enter to send)"
              className="min-h-[60px]"
            />
            <Button variant="neon" onClick={send} disabled={sending || !body.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </GlowCard>
      </main>
    </HoneycombLayout>
  );
}