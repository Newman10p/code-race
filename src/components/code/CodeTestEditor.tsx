import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, EyeOff, Eye } from "lucide-react";
import type { TestCase } from "@/lib/code-runners";

export function CodeTestEditor({
  language,
  mode,
  tests,
  onLanguageChange,
  onModeChange,
  onChange,
}: {
  language: string;
  mode: "io" | "assert";
  tests: TestCase[];
  onLanguageChange: (l: string) => void;
  onModeChange: (m: "io" | "assert") => void;
  onChange: (t: TestCase[]) => void;
}) {
  const addTest = () => onChange([...tests, { name: `Test ${tests.length + 1}`, stdin: "", expected: "", is_hidden: false }]);
  const update = (i: number, u: Partial<TestCase>) => onChange(tests.map((t, idx) => (idx === i ? { ...t, ...u } : t)));
  const remove = (i: number) => onChange(tests.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-background/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">Language:</label>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="rounded border border-input bg-card px-2 py-1 text-xs focus:outline-none"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="html">HTML / CSS</option>
        </select>
        <label className="ml-2 text-xs font-medium text-muted-foreground">Test mode:</label>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as "io" | "assert")}
          className="rounded border border-input bg-card px-2 py-1 text-xs focus:outline-none"
        >
          <option value="io">Input / Expected Output</option>
          <option value="assert">Assertion Code</option>
        </select>
      </div>

      {tests.length === 0 && (
        <p className="text-xs text-muted-foreground">No test cases yet. Learners must have at least one test to earn points.</p>
      )}

      <div className="space-y-2">
        {tests.map((t, i) => (
          <div key={i} className="rounded border border-border bg-card p-2">
            <div className="mb-2 flex items-center gap-2">
              <Input
                value={t.name || ""}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder={`Test ${i + 1}`}
                className="h-7 flex-1 bg-background text-xs"
              />
              <button
                onClick={() => update(i, { is_hidden: !t.is_hidden })}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                  t.is_hidden ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}
                title={t.is_hidden ? "Hidden from learners" : "Visible to learners"}
              >
                {t.is_hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {t.is_hidden ? "Hidden" : "Visible"}
              </button>
              <Button variant="ghost" size="icon" onClick={() => remove(i)} className="h-7 w-7 text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {mode === "io" ? (
              language === "html" ? (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">CSS selector that must exist</label>
                  <Input
                    value={t.expected || ""}
                    onChange={(e) => update(i, { expected: e.target.value })}
                    placeholder="e.g. h1.title"
                    className="mt-1 h-8 bg-background font-mono text-xs"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">stdin</label>
                    <textarea
                      value={t.stdin || ""}
                      onChange={(e) => update(i, { stdin: e.target.value })}
                      className="mt-1 w-full rounded border border-input bg-background p-2 font-mono text-xs focus:outline-none"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">expected stdout</label>
                    <textarea
                      value={t.expected || ""}
                      onChange={(e) => update(i, { expected: e.target.value })}
                      className="mt-1 w-full rounded border border-input bg-background p-2 font-mono text-xs focus:outline-none"
                      rows={3}
                    />
                  </div>
                </div>
              )
            ) : (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Assertion code (runs after learner's code; throw to fail)
                </label>
                <textarea
                  value={t.code || ""}
                  onChange={(e) => update(i, { code: e.target.value })}
                  placeholder={
                    language === "python"
                      ? "assert add(2, 3) == 5"
                      : language === "html"
                        ? "if (!doc.querySelector('h1')) throw new Error('missing h1')"
                        : "if (add(2,3) !== 5) throw new Error('wrong')"
                  }
                  className="mt-1 w-full rounded border border-input bg-background p-2 font-mono text-xs focus:outline-none"
                  rows={3}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="neon-outline" size="sm" onClick={addTest}>
        <Plus className="h-3 w-3" /> Add Test
      </Button>
    </div>
  );
}