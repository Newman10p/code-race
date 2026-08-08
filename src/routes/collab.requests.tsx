import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { myDisplayName } from "@/lib/collab";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/collab/requests")({
  head: () => ({
    meta: [
      { title: "Chat requests — Student Hub | CodeRace" },
      { name: "description", content: "Private conversations only start when both students agree — review and respond to chat requests here." },
      { property: "og:title", content: "Chat requests — Student Hub | CodeRace" },
      { property: "og:description", content: "Review and respond to private chat requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestsPage,
});

interface Req { id: string; requester_id: string; requester_name: string; recipient_id: string; recipient_name: string | null; reason: string; status: string; created_at: string }

function RequestsPage() {
  const { user } = useAuth();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [people, setPeople] = useState<{ user_id: string; display_name: string | null }[]>([]);
  const [target, setTarget] = useState<string>("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("chat_requests").select("*").order("created_at", { ascending: false });
    setReqs((data || []) as Req[]);
    const { data: mine } = await supabase.from("collab_group_members").select("group_id").eq("user_id", user.id);
    const ids = (mine || []).map((m) => m.group_id);
    if (ids.length) {
      const { data: mates } = await supabase.from("collab_group_members").select("user_id, display_name").in("group_id", ids);
      const seen = new Set<string>();
      setPeople((mates || []).filter((m) => m.user_id !== user.id && !seen.has(m.user_id) && seen.add(m.user_id)));
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const sendRequest = async () => {
    if (!user || !target) return;
    const name = await myDisplayName(user.id, user.email);
    const { error } = await supabase.from("chat_requests").insert({
      requester_id: user.id,
      requester_name: name,
      recipient_id: target,
      recipient_name: people.find((p) => p.user_id === target)?.display_name ?? null,
      reason: reason.trim(),
    });
    if (error) return toast.error(error.message);
    setReason("");
    setTarget("");
    toast.success("Request sent — they must accept before any chat opens.");
    void load();
  };

  const respond = async (r: Req, status: "accepted" | "declined") => {
    const { error } = await supabase.from("chat_requests").update({ status, responded_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    if (status === "accepted" && user) {
      const [a, b] = [r.requester_id, r.recipient_id].sort();
      await supabase.from("dm_conversations").insert({ user_a: a, user_b: b, user_a_name: r.requester_name, user_b_name: r.recipient_name });
    }
    void load();
  };

  const block = async (otherId: string) => {
    if (!user) return;
    await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: otherId });
    toast.success("Blocked. They can no longer request or message you.");
    void load();
  };

  const incoming = reqs.filter((r) => r.recipient_id === user?.id && r.status === "pending");
  const outgoing = reqs.filter((r) => r.requester_id === user?.id);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border hub-border hub-surface p-4">
        <h2 className="mb-3 font-semibold hub-text">Ask to chat privately</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="who">Classmate</Label>
            <select id="who" value={target} onChange={(e) => setTarget(e.target.value)} className="w-full rounded-md border hub-border hub-deep px-3 py-2 text-sm hub-text">
              <option value="">Select someone from your groups…</option>
              {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.display_name || "Student"}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="why">Reason (optional)</Label>
            <Textarea id="why" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Want to pair on the Python task?" />
          </div>
          <Button variant="neon" onClick={sendRequest} disabled={!target}>Send request</Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-xl border hub-border hub-surface p-4">
          <h2 className="mb-3 font-semibold hub-text">Incoming</h2>
          {incoming.length === 0 ? <p className="text-sm hub-text-dim">No pending requests.</p> : (
            <ul className="space-y-3">
              {incoming.map((r) => (
                <li key={r.id} className="rounded-lg border hub-border p-3">
                  <p className="text-sm hub-text">{r.requester_name}</p>
                  {r.reason && <p className="mb-2 text-sm hub-text-dim">{r.reason}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" variant="neon" onClick={() => respond(r, "accepted")}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => respond(r, "declined")}>Decline</Button>
                    <Button size="sm" variant="ghost" onClick={() => block(r.requester_id)}>Block</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border hub-border hub-surface p-4">
          <h2 className="mb-3 font-semibold hub-text">Sent</h2>
          {outgoing.length === 0 ? <p className="text-sm hub-text-dim">Nothing sent yet.</p> : (
            <ul className="space-y-2">
              {outgoing.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span className="hub-text">{r.recipient_name || "Student"}</span>
                  <span className="text-xs uppercase hub-text-dim">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}