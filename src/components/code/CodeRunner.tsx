import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, CheckCircle2, XCircle, EyeOff } from "lucide-react";
import { MonacoCodeEditor } from "./MonacoCodeEditor";
import { runCode, type TestCase, type TestResult } from "@/lib/code-runners";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Full VS Code-like code panel: editor + run button + tests panel + output.
 * Used by the race view and lessons player.
 */
export function CodeRunner({
  language,
  code,
  onCodeChange,
  tests,
  testMode,
  height = "260px",
  showPreview = false,
  disabled = false,
  onResult,
}: {
  language: string;
  code: string;
  onCodeChange: (v: string) => void;
  tests: TestCase[];
  testMode: "io" | "assert";
  height?: string;
  showPreview?: boolean;
  disabled?: boolean;
  onResult?: (res: { passed: number; total: number; results: TestResult[] }) => void;
}) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const testsToRun = tests.length > 0 ? tests : [{ name: "run", stdin: "", expected: "" }];
      const res = await runCode(language, code, testsToRun, testMode);
      setResults(tests.length > 0 ? res.testResults : null);
      setLogs(res.logs);
      setError(res.error);
      if (onResult && tests.length > 0) {
        onResult({
          passed: res.testResults.filter((r) => r.passed).length,
          total: res.testResults.length,
          results: res.testResults,
        });
      }
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setRunning(false);
    }
  };

  const passed = results ? results.filter((r) => r.passed).length : 0;
  const total = results?.length ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {language}
          </span>
          {tests.length > 0 && (
            <span className="text-xs text-muted-foreground">{tests.length} test{tests.length === 1 ? "" : "s"}</span>
          )}
        </div>
        <Button variant="neon" size="sm" onClick={run} disabled={running || disabled}>
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          {running ? "Running..." : "Run"}
        </Button>
      </div>

      <MonacoCodeEditor
        value={code}
        onChange={onCodeChange}
        language={language}
        height={height}
        readOnly={disabled}
        onRun={run}
      />

      {showPreview && language === "html" && (
        <div className="overflow-hidden rounded-lg border border-primary/20 bg-white">
          <iframe title="preview" srcDoc={code} sandbox="allow-scripts" className="h-64 w-full" />
        </div>
      )}

      {(results || logs || error) && (
        <div className="rounded-lg border border-primary/20 bg-[#000814] p-3 font-mono text-xs">
          {error && (
            <div className="mb-2 flex items-start gap-2 text-destructive">
              <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <pre className="whitespace-pre-wrap">{error}</pre>
            </div>
          )}
          {results && results.length > 0 && (
            <div className="mb-2">
              <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider">
                <span className={passed === total ? "text-green-500" : "text-yellow-500"}>
                  {passed}/{total} passed
                </span>
              </div>
              <div className="space-y-1">
                <AnimatePresence>
                  {results.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-start gap-2 rounded px-2 py-1 ${
                        r.passed ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {r.passed ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> : <XCircle className="mt-0.5 h-3 w-3 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          {r.hidden && <EyeOff className="h-3 w-3 opacity-60" />}
                          <span className="truncate">{r.hidden ? `Hidden test ${i + 1}` : r.name}</span>
                        </div>
                        {!r.hidden && r.error && <div className="mt-0.5 opacity-80">{r.error}</div>}
                        {!r.hidden && !r.passed && r.expected !== undefined && (
                          <div className="mt-0.5 opacity-80">
                            expected: <span className="text-foreground">{r.expected}</span> · got: <span className="text-foreground">{r.actual || "(nothing)"}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
          {logs && (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground">Console output</summary>
              <pre className="mt-1 whitespace-pre-wrap text-foreground">{logs}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}