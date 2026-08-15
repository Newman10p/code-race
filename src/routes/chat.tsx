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
      <main className="relative mx-auto flex h-[calc(100vh-4rem)] max-w-5xl flex-col overflow-hidden px-4 py-6">
        {/* Header with modern gradient */}
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-4 shadow-lg shadow-purple-500/20">
          <Link to={isSetter ? "/dashboard" : "/organisation"} className="group inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> 
            Back
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h1 className="flex items-center gap-2 text-xl font-bold text-white">
                <MessageSquare className="h-5 w-5" /> 
                Patron Chat
              </h1>
              <p className="text-xs text-white/80">Connect with setters & patrons</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
              <div className="relative">
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
                <div className="absolute inset-0 h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400/50" />
              </div>
              <span>{messages.length}</span>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <GlowCard className="flex flex-1 overflow-hidden border-0 shadow-2xl shadow-purple-500/10">
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950">
            
            {/* Messages Area */}
            <div className="relative flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-purple-300 hover:scrollbar-thumb-purple-400 dark:scrollbar-thumb-purple-700 dark:hover:scrollbar-thumb-purple-600">
              
              {messages.length === 0 && (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-purple-200 opacity-20 dark:bg-purple-800" />
                    <div className="relative rounded-full bg-gradient-to-br from-violet-500 to-purple-600 p-6 shadow-xl shadow-purple-500/30">
                      <MessageSquare className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">Start the Conversation</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Be the first to share ideas with your team!</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {messages.map((m, idx) => {
                  const mine = m.sender_id === user?.id;
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const sameSender = prevMsg && prevMsg.sender_id === m.sender_id;
                  const time = new Date(m.created_at);
                  
                  // Generate consistent color based on sender_id
                  const colors = [
                    'from-violet-500 to-purple-600',
                    'from-blue-500 to-cyan-600',
                    'from-emerald-500 to-teal-600',
                    'from-orange-500 to-amber-600',
                    'from-pink-500 to-rose-600',
                    'from-indigo-500 to-blue-600',
                  ];
                  const colorIndex = m.sender_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
                  const senderColor = colors[colorIndex];
                  
                  return (
                    <div 
                      key={m.id} 
                      className={`flex ${mine ? "justify-end" : "justify-start"} ${sameSender ? "mt-1" : "mt-4"}`}
                    >
                      <div className={`flex max-w-[75%] items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                        
                        {/* Avatar */}
                        {!sameSender && (
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${senderColor} shadow-md ring-2 ring-white dark:ring-slate-800`}>
                            <span className="text-xs font-bold text-white">
                              {m.sender_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {sameSender && <div className="w-8" />}
                        
                        {/* Message Bubble */}
                        <div className="group relative">
                          {!sameSender && (
                            <div className={`mb-1.5 px-1 text-xs font-semibold ${mine ? "text-right text-purple-600 dark:text-purple-400" : "text-slate-600 dark:text-slate-400"}`}>
                              {m.sender_name}
                              <span className="ml-2 font-normal text-slate-400 dark:text-slate-500">
                                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                          
                          <div
                            className={`relative overflow-hidden px-4 py-3 shadow-md transition-all duration-200 hover:shadow-lg ${
                              mine
                                ? "rounded-2xl rounded-tr-sm bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white shadow-purple-500/25"
                                : "rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-slate-200/50 dark:shadow-slate-900/50"
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                            
                            {/* Timestamp for grouped messages */}
                            {sameSender && (
                              <div className={`mt-1.5 text-xs ${mine ? "text-white/60" : "text-slate-400 dark:text-slate-500"}`}>
                                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div ref={bottomRef} />
            </div>
            
            {/* Input Area */}
            <div className="border-t border-slate-200/60 bg-white/80 p-4 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/80">
              <div className="mx-auto flex max-w-4xl items-end gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden h-10 w-10 shrink-0 rounded-full text-slate-400 hover:text-purple-600 sm:flex"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                
                <div className="relative flex-1">
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                    }}
                    placeholder="Type your message..."
                    className="min-h-[50px] max-h-[120px] resize-none rounded-2xl border-0 bg-slate-100 px-4 py-3 pr-12 text-sm focus-visible:ring-2 focus-visible:ring-purple-500 dark:bg-slate-800 dark:placeholder:text-slate-500"
                    rows={1}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-2 right-2 h-8 w-8 rounded-full text-slate-400 hover:text-purple-600"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button 
                  onClick={send} 
                  disabled={sending || !body.trim()}
                  className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-0 shadow-lg shadow-purple-500/30 transition-all hover:scale-105 hover:shadow-purple-500/50 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send className={`h-5 w-5 text-white transition-transform ${sending ? "" : "ml-0.5"}`} />
                </Button>
              </div>
              
              <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </GlowCard>
      </main>
    </HoneycombLayout>
  );
}