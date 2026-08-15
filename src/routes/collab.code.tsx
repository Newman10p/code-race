import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CodeRunner } from "@/components/code/CodeRunner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { myDisplayName } from "@/lib/collab";
import { toast } from "sonner";
import { Share2 } from "lucide-react";

export const Route = createFileRoute("/collab/code")({
  component: CodeSpace,
});

const STARTERS: Record<string, string> = {
  javascript: "// Sketch an idea, run it, then share it with your group.\nconsole.log('Hello hub');\n",
  python: "# Sketch an idea, run it, then share it with your group.\nprint('Hello hub')\n",
  html: "<!doctype html>\n<html>\n  <body>\n    <h1>Hello hub</h1>\n  </body>\n</html>\n",
};

function CodeSpace() {
  const { user } = useAuth();
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(STARTERS.javascript);
  const [filename, setFilename] = useState("scratch.js");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupId, setGroupId] = useState("");
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: mem } = await supabase.from("collab_group_members").select("group_id").eq("user_id", user.id);
    const ids = (mem || []).map((m) => m.group_id);
    if (!ids.length) return;
    const { data } = await supabase.from("collab_groups").select("id,name").in("id", ids).eq("status", "active");
    setGroups(data || []);
    if (data?.length) setGroupId((g) => g || data[0].id);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const switchLanguage = (lang: string) => {
    setLanguage(lang);
    setCode(STARTERS[lang]);
    setFilename(lang === "python" ? "scratch.py" : lang === "html" ? "index.html" : "scratch.js");
  };

  const share = async () => {
    if (!user || !groupId || !code.trim()) return;
    setSharing(true);
    const name = await myDisplayName(user.id, user.email);
    const { error } = await supabase.from("collab_messages").insert({
      group_id: groupId,
      sender_id: user.id,
      sender_name: name,
      body: code,
      kind: "code",
      code_language: language,
      code_filename: filename.trim() || null,
    });
    setSharing(false);
    if (error) return toast.error(error.message);
    toast.success("Shared to your group's chat.");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Code Space</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Experiment with code, run it instantly, and share results with your group.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="lang" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Language</Label>
            <select
              id="lang"
              value={language}
              onChange={(e) => switchLanguage(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="javascript">🟨 JavaScript</option>
              <option value="python">🐍 Python</option>
              <option value="html">🌐 HTML / CSS</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fname" className="text-sm font-semibold text-slate-700 dark:text-slate-300">File Name</Label>
            <Input 
              id="fname" 
              value={filename} 
              onChange={(e) => setFilename(e.target.value)} 
              className="w-44 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
              placeholder="script.js"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grp" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Share With</Label>
            <select
              id="grp"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              {groups.length === 0 && <option value="">Join a group first</option>}
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <Button 
            onClick={share} 
            disabled={sharing || !groupId}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-lg"
          >
            <Share2 className="h-4 w-4 mr-2" /> 
            {sharing ? "Sharing..." : "Share to Chat"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <CodeRunner
          language={language}
          code={code}
          onCodeChange={setCode}
          tests={[]}
          testMode="io"
          height="450px"
          showPreview
        />
      </div>
    </div>
  );
}
