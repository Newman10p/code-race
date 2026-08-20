import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lightbulb, CheckCircle2, Play, ChevronRight, Sparkles, Loader2, XCircle, Terminal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MonacoCodeEditor } from "@/components/code/MonacoCodeEditor";
import { runCode, type TestCase, type TestResult } from "@/lib/code-runners";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/learn/lesson/$lessonId")({
  component: LessonPlayer,
});

function LessonPlayer() {
  const { lessonId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<any>(null);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [logs, setLogs] = useState("");
  const [runError, setRunError] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [shake, setShake] = useState(0);
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    (async () => {
      const { data: l } = await supabase.from("lessons" as any).select("*").eq("id", lessonId).single();
      if (!l) return;
      setLesson(l);
      setCode((l as any).starter_code || "");
      setResults(null);
      setPassed(false);
      setAttempts(0);
      setHintOpen(false);
      const { data: sibs } = await supabase.from("lessons" as any).select("id, order_index").eq("course_id", (l as any).course_id).order("order_index");
      setSiblings((sibs as any) || []);
    })();
  }, [lessonId]);

  const currentIdx = siblings.findIndex((s) => s.id === lessonId);
  const nextLesson = siblings[currentIdx + 1];

  const run = async () => {
    if (!lesson) return;
    setRunning(true);
    setRunError(null);
    try {
      const tests: TestCase[] = (lesson.test_cases as TestCase[]) || [];
      const testsToRun = tests.length > 0 ? tests : [{ name: "run" }];
      const res = await runCode(lesson.language || "javascript", code, testsToRun, lesson.test_mode || "io");
      setResults(tests.length > 0 ? res.testResults : null);
      setLogs(res.logs);
      setRunError(res.error);
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      const didPass = tests.length > 0 && res.testResults.every((r) => r.passed) && res.testResults.length > 0;
      if (didPass) {
        setPassed(true);
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#00d4ff", "#6ee7b7", "#c084fc"] });
        if (user) {
          await supabase.from("lesson_progress" as any).upsert(
            { user_id: user.id, lesson_id: lessonId, completed_at: new Date().toISOString(), attempts: nextAttempts },
            { onConflict: "user_id,lesson_id" }
          );
        }
      } else {
        setShake((s) => s + 1);
      }
    } catch (e: any) {
      setRunError(String(e.message || e));
    } finally {
      setRunning(false);
    }
  };

  if (!lesson) {
    return (
      <HoneycombLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </HoneycombLayout>
    );
  }

  const isHtml = lesson.language === "html";

  return (
    <HoneycombLayout>
      <div className="flex h-screen flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-primary/20 bg-background/80 px-4 py-2 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Link to="/learn/course/$courseId" params={{ courseId: lesson.course_id }}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" /> Exit
              </Button>
            </Link>
            <div className="flex items-center gap-1">
              {siblings.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={`h-2 w-6 rounded-full ${
                    i < currentIdx ? "bg-green-500" : i === currentIdx ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Lesson {currentIdx + 1} of {siblings.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {passed && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-500"
              >
                <CheckCircle2 className="h-3 w-3" /> Passed
              </motion.span>
            )}
          </div>
        </div>

        {/* Three-column workbench */}
        <div className="grid flex-1 grid-cols-1 gap-2 overflow-hidden bg-background p-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* LEFT: Instructor */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex flex-col overflow-hidden rounded-lg border border-primary/20 bg-card"
          >
            <div className="border-b border-primary/20 bg-background/50 px-4 py-2">
              <h2 className="font-bold">{lesson.title}</h2>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              {lesson.image_url && (
                <img src={lesson.image_url} alt="" className="w-full rounded-lg border border-border" />
              )}
              <div className="whitespace-pre-wrap text-foreground/90">{lesson.concept_markdown}</div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3"
              >
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">Objective</p>
                <p className="text-sm font-medium">{lesson.objective}</p>
              </motion.div>
              {lesson.hint && (
                <div>
                  <button
                    onClick={() => setHintOpen(!hintOpen)}
                    disabled={attempts === 0}
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm transition hover:border-primary/40 disabled:opacity-50"
                    title={attempts === 0 ? "Try running your code once first" : ""}
                  >
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <span className="flex-1 text-left">{hintOpen ? "Hide" : "Show"} Hint</span>
                    {attempts === 0 && <span className="text-[10px] text-muted-foreground">try first</span>}
                  </button>
                  <AnimatePresence>
                    {hintOpen && attempts > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm">
                          {lesson.hint}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>

          {/* CENTER: Editor */}
          <motion.div
            key={shake}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1, ...(shake > 0 && !passed ? { x: [0, -6, 6, -4, 4, 0] } : {}) }}
            transition={{ duration: shake > 0 ? 0.4 : 0.3 }}
            className="flex flex-col overflow-hidden rounded-lg border border-primary/20"
          >
            <div className="flex items-center justify-between border-b border-primary/20 bg-[#000814] px-3 py-1.5">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex gap-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                </div>
                editor.{lesson.language === "python" ? "py" : lesson.language === "html" ? "html" : "js"}
              </span>
              <span className="text-[10px] text-muted-foreground">Ctrl+Enter to run</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <MonacoCodeEditor
                value={code}
                onChange={setCode}
                language={lesson.language}
                height="100%"
                onRun={run}
              />
            </div>
          </motion.div>

          {/* RIGHT: Preview / Terminal */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col overflow-hidden rounded-lg border border-primary/20 bg-card"
          >
            <div className="flex items-center gap-2 border-b border-primary/20 bg-background/50 px-3 py-2">
              <Terminal className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium">{isHtml ? "Live Preview" : "Terminal Output"}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              {isHtml ? (
                <iframe ref={previewRef} title="preview" srcDoc={code} sandbox="allow-scripts" className="h-full w-full bg-white" />
              ) : (
                <div className="h-full space-y-2 overflow-y-auto bg-[#000814] p-3 font-mono text-xs">
                  {runError && (
                    <div className="flex items-start gap-2 text-destructive">
                      <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      <pre className="whitespace-pre-wrap">{runError}</pre>
                    </div>
                  )}
                  {results && (
                    <div className="space-y-1">
                      {results.map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className={`flex items-start gap-2 rounded px-2 py-1 ${
                            r.passed ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {r.passed ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> : <XCircle className="mt-0.5 h-3 w-3 shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold">{r.name}</div>
                            {!r.passed && r.error && <div className="mt-0.5 opacity-80">{r.error}</div>}
                            {!r.passed && r.expected !== undefined && (
                              <div className="mt-0.5 opacity-80">expected: <span className="text-foreground">{r.expected}</span></div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {logs && (
                    <div>
                      <div className="mb-1 text-[10px] uppercase text-muted-foreground">stdout</div>
                      <pre className="whitespace-pre-wrap text-foreground">{logs}</pre>
                    </div>
                  )}
                  {!results && !logs && !runError && (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <p>Click "Run Code" to see output</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-primary/20 bg-background/80 px-4 py-3 backdrop-blur-xl">
          <div className="text-xs text-muted-foreground">
            {attempts > 0 && (
              <span>Attempts: {attempts}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="neon-outline" size="lg" onClick={run} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? "Running..." : "Run Code"}
            </Button>
            <motion.div
              animate={passed ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: passed ? Infinity : 0, duration: 1.5 }}
            >
              <Button
                variant="neon"
                size="lg"
                disabled={!passed}
                onClick={() => {
                  if (nextLesson) {
                    navigate({ to: "/learn/lesson/$lessonId", params: { lessonId: nextLesson.id } });
                  } else {
                    navigate({ to: "/learn/course/$courseId", params: { courseId: lesson.course_id } });
                  }
                }}
                className={passed ? "shadow-[0_0_30px_rgba(0,212,255,0.5)]" : ""}
              >
                {nextLesson ? "Next Lesson" : "Finish Course"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Pass overlay */}
        <AnimatePresence>
          {passed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: -50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-green-500/20 px-6 py-3 backdrop-blur-xl"
            >
              <div className="flex items-center gap-2 text-lg font-bold text-green-500">
                <Sparkles className="h-5 w-5" /> Nice work!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </HoneycombLayout>
  );
}