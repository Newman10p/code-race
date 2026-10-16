import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { myDisplayName } from "@/lib/collab";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Upload, X, Download } from "lucide-react";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Project Submissions | CodeRace" },
      { name: "description", content: "Learners submit project links and design documents; setters review them by name and school." },
      { property: "og:title", content: "Project Submissions | CodeRace" },
      { property: "og:description", content: "Share your project links and architecture document with your setter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectsPage,
});

type Extra = { label: string; url: string };

function ProjectsPage() {
  const { user, loading } = useAuth();
  const { isSetter, isPatron, loading: roleLoading } = useUserRole();
  const reviewer = isSetter || isPatron;

  if (loading || roleLoading) return <HoneycombLayout><Navbar /><p className="p-6 text-muted-foreground">Loading…</p></HoneycombLayout>;
  if (!user) return <HoneycombLayout><Navbar /><p className="p-6 text-muted-foreground">Please sign in.</p></HoneycombLayout>;

  return (
    <HoneycombLayout>
      <Navbar />
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FileText className="h-6 w-6 text-primary" />{reviewer ? "Learner project submissions" : "Submit your project"}
        </h1>
        {reviewer ? <ReviewerView /> : <LearnerView userId={user.id} email={user.email ?? null} />}
      </div>
    </HoneycombLayout>
  );
}

function LearnerView({ userId, email }: { userId: string; email: string | null }) {
  const [mine, setMine] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [extras, setExtras] = useState<Extra[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => supabase.from("project_submissions").select("*").eq("user_id", userId)
    .order("created_at", { ascending: false }).then(({ data }) => setMine(data || []));
  useEffect(() => { load(); }, [userId]);

  const submit = async () => {
    if (!title.trim()) return toast.error("Give your project a title.");
    setBusy(true);
    try {
      const learner_name = await myDisplayName(userId, email);
      const { data: member } = await supabase
        .from("organization_members")
        .select("organization_id, organizations(school_name)")
        .eq("user_id", userId).maybeSingle();

      let document_path: string | null = null;
      let document_name: string | null = null;
      if (file) {
        const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const { error } = await supabase.storage.from("project-docs").upload(path, file);
        if (error) throw error;
        document_path = path;
        document_name = file.name;
      }

      const { error } = await supabase.from("project_submissions").insert({
        user_id: userId,
        learner_name,
        school_name: (member as any)?.organizations?.school_name ?? null,
        organization_id: (member as any)?.organization_id ?? null,
        title: title.trim(),
        description: description.trim(),
        project_url: projectUrl.trim() || null,
        repo_url: repoUrl.trim() || null,
        extra_links: extras.filter((e) => e.url.trim()) as any,
        document_path,
        document_name,
      });
      if (error) throw error;
      toast.success("Submitted — your setter can now see it.");
      setTitle(""); setDescription(""); setProjectUrl(""); setRepoUrl(""); setExtras([]); setFile(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    await supabase.from("project_submissions").delete().eq("id", id);
    load();
  };

  return (
    <>
      <GlowCard className="space-y-3 p-5">
        <Input placeholder="Project title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea rows={3} placeholder="Short description of what you built" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input placeholder="Live project link (https://…)" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} />
        <Input placeholder="GitHub repository link" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
        {extras.map((x, i) => (
          <div key={i} className="flex gap-2">
            <Input className="w-40" placeholder="Label" value={x.label}
              onChange={(e) => setExtras(extras.map((v, j) => j === i ? { ...v, label: e.target.value } : v))} />
            <Input placeholder="https://…" value={x.url}
              onChange={(e) => setExtras(extras.map((v, j) => j === i ? { ...v, url: e.target.value } : v))} />
            <Button variant="ghost" size="icon" onClick={() => setExtras(extras.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setExtras([...extras, { label: "", url: "" }])}>
          <Plus className="mr-1 h-4 w-4" />Add another link
        </Button>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">System architecture document (Word or PDF)</label>
          <input type="file" accept=".doc,.docx,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs text-muted-foreground file:mr-2 file:rounded file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-xs file:text-foreground" />
        </div>
        <Button onClick={submit} disabled={busy}><Upload className="mr-1 h-4 w-4" />Submit project</Button>
      </GlowCard>

      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">My submissions</h2>
      {mine.length === 0 && <p className="text-sm text-muted-foreground">You haven't submitted a project yet.</p>}
      {mine.map((s) => (
        <GlowCard key={s.id} className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-semibold">{s.title}</p>
            <p className="text-xs text-muted-foreground">Sent {new Date(s.created_at).toLocaleString()}</p>
            <LinkList s={s} />
          </div>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
        </GlowCard>
      ))}
    </>
  );
}

function LinkList({ s }: { s: any }) {
  const links: Extra[] = [
    ...(s.project_url ? [{ label: "Project", url: s.project_url }] : []),
    ...(s.repo_url ? [{ label: "GitHub", url: s.repo_url }] : []),
    ...((s.extra_links as Extra[]) || []),
  ];
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      {links.map((l, i) => (
        <a key={i} href={l.url} target="_blank" rel="noreferrer"
          className="rounded-full border border-primary/40 px-2 py-0.5 text-primary hover:bg-primary/10">{l.label || "Link"}</a>
      ))}
    </div>
  );
}

function ReviewerView() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("project_submissions").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, []);

  const open = async (s: any) => {
    const { data, error } = await supabase.storage.from("project-docs").createSignedUrl(s.document_path, 300);
    if (error || !data) return toast.error("Couldn't open that document.");
    window.open(data.signedUrl, "_blank");
  };

  const filtered = rows.filter((r) =>
    `${r.learner_name} ${r.school_name ?? ""} ${r.title}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <Input placeholder="Search by learner, school or project" value={q} onChange={(e) => setQ(e.target.value)} />
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
      {filtered.map((s) => (
        <GlowCard key={s.id} className="space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{s.learner_name}</p>
              <p className="text-xs text-muted-foreground">{s.school_name || "No school linked"} · {new Date(s.created_at).toLocaleString()}</p>
            </div>
            {s.document_path && (
              <Button size="sm" variant="outline" onClick={() => open(s)}>
                <Download className="mr-1 h-4 w-4" />{s.document_name || "Design document"}
              </Button>
            )}
          </div>
          <p className="font-medium">{s.title}</p>
          {s.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{s.description}</p>}
          <LinkList s={s} />
        </GlowCard>
      ))}
    </>
  );
}
