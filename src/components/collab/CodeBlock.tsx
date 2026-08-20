import { useState } from "react";
import { Copy, Check, Maximize2, Minimize2, Download } from "lucide-react";

const EXT: Record<string, string> = {
  python: "py", javascript: "js", typescript: "ts", html: "html", css: "css",
  java: "java", c: "c", cpp: "cpp", csharp: "cs", php: "php", sql: "sql", json: "json",
};

export function detectLanguage(code: string): string {
  const c = code.trim();
  if (/^\s*(def |import |from .+ import|print\()/m.test(c)) return "python";
  if (/^\s*(#include|int main\s*\()/m.test(c)) return "cpp";
  if (/^\s*(public\s+class|System\.out\.println)/m.test(c)) return "java";
  if (/<\/?[a-z][\s\S]*>/i.test(c) && /<html|<div|<body/i.test(c)) return "html";
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE)\s/i.test(c)) return "sql";
  if (/^\s*[.#a-z][\w-]*\s*\{[^}]*:[^}]*\}/m.test(c) && !/function|=>/.test(c)) return "css";
  if (/^\s*(interface |type \w+ =|: string|: number)/m.test(c)) return "typescript";
  if (/(function |=>|const |let |console\.log)/.test(c)) return "javascript";
  return "text";
}

/** Read-only, non-executing code presentation with copy / expand / download. */
export function CodeBlock({
  code,
  language,
  filename,
}: {
  code: string;
  language?: string | null;
  filename?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lang = language || detectLanguage(code);
  const lines = code.replace(/\s+$/, "").split("\n");
  const collapsed = !expanded && lines.length > 14;
  const shown = collapsed ? lines.slice(0, 14) : lines;

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || `snippet.${EXT[lang] || "txt"}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mt-2 overflow-hidden rounded-lg border hub-border hub-deep">
      <div className="flex items-center justify-between gap-2 border-b hub-border px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {lang}
          </span>
          {filename && <span className="truncate font-mono text-xs hub-text-dim">{filename}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copy} aria-label="Copy code" className="rounded p-1.5 hub-text-dim hover:bg-white/10 hover:text-white">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => setExpanded((v) => !v)} aria-label={expanded ? "Collapse code" : "Expand code"} className="rounded p-1.5 hub-text-dim hover:bg-white/10 hover:text-white">
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button onClick={download} aria-label="Download code" className="rounded p-1.5 hub-text-dim hover:bg-white/10 hover:text-white">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-white">
        {shown.map((l, i) => (
          <div key={i} className="flex">
            {expanded && <span className="mr-3 w-8 shrink-0 select-none text-right hub-text-dim">{i + 1}</span>}
            <span className="whitespace-pre">{l || " "}</span>
          </div>
        ))}
      </pre>
      {collapsed && (
        <button onClick={() => setExpanded(true)} className="w-full border-t hub-border py-1.5 text-xs text-primary hover:bg-white/5">
          Show {lines.length - 14} more lines
        </button>
      )}
    </div>
  );
}