// Client-side code runners for JS, Python (Pyodide), and HTML.
// Returns { logs, error, testResults } for a code + language + tests combo.

export type TestCase = {
  stdin?: string;
  expected?: string;
  code?: string; // assertion code
  is_hidden?: boolean;
  name?: string;
};

export type TestResult = {
  name: string;
  passed: boolean;
  hidden: boolean;
  actual?: string;
  expected?: string;
  error?: string;
};

export type RunResult = {
  logs: string;
  error: string | null;
  testResults: TestResult[];
};

// ─── JavaScript runner ──────────────────────────────────────────
function runJs(code: string, tests: TestCase[], mode: "io" | "assert"): Promise<RunResult> {
  return new Promise((resolve) => {
    const worker = new Worker(
      URL.createObjectURL(
        new Blob(
          [
            `self.onmessage = async (e) => {
              const { code, tests, mode } = e.data;
              const results = [];
              let logs = '';
              const capture = (...a) => { logs += a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ') + '\\n'; };
              const originalLog = console.log;
              console.log = capture;
              try {
                if (mode === 'io') {
                  for (const t of tests) {
                    logs = '';
                    // Provide stdin via a global "input()" function that returns lines one-by-one.
                    const lines = (t.stdin || '').split(/\\r?\\n/);
                    let li = 0;
                    self.input = () => lines[li++] ?? '';
                    try {
                      const fn = new Function('input', code);
                      await fn(self.input);
                      const actual = logs.trim();
                      const expected = (t.expected || '').trim();
                      results.push({ name: t.name || 'test', passed: actual === expected, hidden: !!t.is_hidden, actual, expected });
                    } catch (err) {
                      results.push({ name: t.name || 'test', passed: false, hidden: !!t.is_hidden, error: String(err) });
                    }
                  }
                } else {
                  // assertion mode: run user code once, then each test as assertion snippet
                  const setupFn = new Function(code + '\\n; return this;');
                  const ctx = setupFn.call({});
                  for (const t of tests) {
                    try {
                      const testFn = new Function(code + '\\n;' + (t.code || ''));
                      testFn();
                      results.push({ name: t.name || 'assertion', passed: true, hidden: !!t.is_hidden });
                    } catch (err) {
                      results.push({ name: t.name || 'assertion', passed: false, hidden: !!t.is_hidden, error: String(err) });
                    }
                  }
                }
                self.postMessage({ logs, error: null, testResults: results });
              } catch (err) {
                self.postMessage({ logs, error: String(err), testResults: results });
              }
            };`,
          ],
          { type: "application/javascript" }
        )
      )
    );
    const timeout = setTimeout(() => {
      worker.terminate();
      resolve({ logs: "", error: "Execution timed out (5s)", testResults: [] });
    }, 5000);
    worker.onmessage = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve({ logs: "", error: e.message, testResults: [] });
    };
    worker.postMessage({ code, tests, mode });
  });
}

// ─── Python runner (Pyodide) ─────────────────────────────────────
let pyodidePromise: Promise<any> | null = null;
async function loadPyodide(): Promise<any> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    if (!(window as any).loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load Pyodide"));
        document.head.appendChild(s);
      });
    }
    return await (window as any).loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
    });
  })();
  return pyodidePromise;
}

async function runPython(code: string, tests: TestCase[], mode: "io" | "assert"): Promise<RunResult> {
  try {
    const pyodide = await loadPyodide();
    const results: TestResult[] = [];
    let allLogs = "";
    if (mode === "io") {
      for (const t of tests) {
        try {
          let out = "";
          pyodide.setStdout({ batched: (s: string) => { out += s + "\n"; } });
          const lines = (t.stdin || "").split(/\r?\n/);
          pyodide.globals.set("__stdin_lines", lines);
          pyodide.globals.set("__stdin_idx", 0);
          const wrapped = `
__idx = 0
def input(prompt=""):
    global __idx
    v = __stdin_lines[__idx] if __idx < len(__stdin_lines) else ""
    __idx += 1
    return v
${code}
`;
          await pyodide.runPythonAsync(wrapped);
          const actual = out.trim();
          const expected = (t.expected || "").trim();
          results.push({ name: t.name || "test", passed: actual === expected, hidden: !!t.is_hidden, actual, expected });
          allLogs = out;
        } catch (err: any) {
          results.push({ name: t.name || "test", passed: false, hidden: !!t.is_hidden, error: String(err.message || err) });
        }
      }
    } else {
      for (const t of tests) {
        try {
          let out = "";
          pyodide.setStdout({ batched: (s: string) => { out += s + "\n"; } });
          await pyodide.runPythonAsync(code + "\n" + (t.code || ""));
          results.push({ name: t.name || "assertion", passed: true, hidden: !!t.is_hidden });
          allLogs = out;
        } catch (err: any) {
          results.push({ name: t.name || "assertion", passed: false, hidden: !!t.is_hidden, error: String(err.message || err) });
        }
      }
    }
    return { logs: allLogs, error: null, testResults: results };
  } catch (err: any) {
    return { logs: "", error: String(err.message || err), testResults: [] };
  }
}

// ─── HTML runner (iframe preview + optional DOM assertions) ────────
async function runHtml(code: string, tests: TestCase[]): Promise<RunResult> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.sandbox.add("allow-scripts");
    iframe.srcdoc = code;
    document.body.appendChild(iframe);
    setTimeout(() => {
      const results: TestResult[] = [];
      try {
        const doc = iframe.contentDocument;
        for (const t of tests) {
          try {
            if (t.code) {
              // assertion runs against the iframe document; user gets `doc` global
              const fn = new Function("doc", t.code);
              fn(doc);
              results.push({ name: t.name || "assertion", passed: true, hidden: !!t.is_hidden });
            } else if (t.expected) {
              // simple: expected is a CSS selector that must exist
              const found = !!doc?.querySelector(t.expected);
              results.push({ name: t.name || `has ${t.expected}`, passed: found, hidden: !!t.is_hidden, expected: t.expected, actual: found ? "found" : "not found" });
            }
          } catch (err: any) {
            results.push({ name: t.name || "test", passed: false, hidden: !!t.is_hidden, error: String(err.message || err) });
          }
        }
      } finally {
        document.body.removeChild(iframe);
      }
      resolve({ logs: "", error: null, testResults: results });
    }, 400);
  });
}

export async function runCode(
  language: string,
  code: string,
  tests: TestCase[],
  mode: "io" | "assert" = "io"
): Promise<RunResult> {
  if (language === "python") return runPython(code, tests, mode);
  if (language === "html") return runHtml(code, tests);
  return runJs(code, tests, mode);
}

export function scorePercent(results: TestResult[]): number {
  if (results.length === 0) return 0;
  const passed = results.filter((r) => r.passed).length;
  return passed / results.length;
}