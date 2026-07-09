import Editor, { loader } from "@monaco-editor/react";
import { useEffect } from "react";

// Configure Monaco once with a cyber dark theme matching the app.
let themeConfigured = false;
function configureMonaco() {
  if (themeConfigured) return;
  themeConfigured = true;
  loader.init().then((monaco) => {
    monaco.editor.defineTheme("cyber-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "5b7a8a", fontStyle: "italic" },
        { token: "keyword", foreground: "00d4ff" },
        { token: "string", foreground: "6ee7b7" },
        { token: "number", foreground: "fbbf24" },
        { token: "type", foreground: "c084fc" },
      ],
      colors: {
        "editor.background": "#000814",
        "editor.foreground": "#e5f5ff",
        "editor.lineHighlightBackground": "#001b3d40",
        "editorLineNumber.foreground": "#3a5c74",
        "editorLineNumber.activeForeground": "#00d4ff",
        "editorCursor.foreground": "#00d4ff",
        "editor.selectionBackground": "#00d4ff33",
        "editor.inactiveSelectionBackground": "#00d4ff20",
        "editorBracketMatch.background": "#00d4ff20",
        "editorBracketMatch.border": "#00d4ff",
      },
    });
  });
}

const languageMap: Record<string, string> = {
  javascript: "javascript",
  js: "javascript",
  python: "python",
  html: "html",
  css: "css",
};

export function MonacoCodeEditor({
  value,
  onChange,
  language = "javascript",
  height = "300px",
  readOnly = false,
  onRun,
}: {
  value: string;
  onChange: (v: string) => void;
  language?: string;
  height?: string | number;
  readOnly?: boolean;
  onRun?: () => void;
}) {
  useEffect(() => {
    configureMonaco();
  }, []);

  return (
    <div
      className="overflow-hidden rounded-lg border border-primary/20 bg-[#000814]"
      style={{ height, minHeight: typeof height === "string" && height.endsWith("%") ? 240 : undefined, width: "100%" }}
    >
      <Editor
        height="100%"
        width="100%"
        language={languageMap[language] || "javascript"}
        theme="cyber-dark"
        value={value}
        onChange={(v) => onChange(v || "")}
        loading={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading editor…</div>}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "JetBrains Mono, monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 12, bottom: 12 },
          smoothScrolling: true,
          cursorBlinking: "smooth",
          renderLineHighlight: "gutter",
        }}
        onMount={(editor, monaco) => {
          if (onRun) {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun());
          }
        }}
      />
    </div>
  );
}