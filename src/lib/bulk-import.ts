import type { TestCase } from "@/lib/code-runners";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export interface BulkResult<T> {
  ok: boolean;
  error?: string;
  data?: T;
  warnings: string[];
}

const splitCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur); cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
};

const tryJson = (text: string): any | null => {
  const t = text.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return null;
  try { return JSON.parse(t); } catch { return null; }
};

const normalizeTests = (raw: any, warnings: string[], label: string): TestCase[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((t: any, i: number): TestCase => {
    if (typeof t === "string") return { name: `Test ${i + 1}`, code: t, is_hidden: false };
    const tc: TestCase = {
      name: String(t.name || `Test ${i + 1}`),
      is_hidden: !!(t.is_hidden ?? t.hidden),
    };
    if (t.stdin !== undefined || t.input !== undefined) tc.stdin = String(t.stdin ?? t.input);
    if (t.expected !== undefined || t.output !== undefined) tc.expected = String(t.expected ?? t.output);
    if (t.code !== undefined || t.assertion !== undefined) tc.code = String(t.code ?? t.assertion);
    if (tc.expected === undefined && tc.code === undefined) {
      warnings.push(`${label}: test "${tc.name}" has no expected output or assertion.`);
    }
    return tc;
  });
};

/* ------------------------------------------------------------------ */
/* Quizzes / Tournaments / Evaluations                                 */
/* ------------------------------------------------------------------ */

export interface BulkQuestion {
  type: "mcq" | "code";
  content: string;
  points: number;
  timeLimit: number;
  roundNumber: number;
  options?: string[];
  correctOption?: number;
  starterCode?: string;
  solution?: string;
  language?: string;
  testMode?: "io" | "assert";
  testCases?: TestCase[];
}

export interface BulkRound {
  roundNumber: number;
  name: string;
  durationSeconds: number;
  cutoffType: "top_n" | "top_pct";
  cutoffValue: number;
}

export interface BulkQuiz {
  title?: string;
  description?: string;
  tournamentMode?: boolean;
  isEvaluation?: boolean;
  rounds?: BulkRound[];
  questions: BulkQuestion[];
}

const normalizeQuestion = (item: any, i: number, warnings: string[]): BulkQuestion | null => {
  const type: "mcq" | "code" = (item.type || "mcq").toLowerCase() === "code" ? "code" : "mcq";
  const content = String(item.content ?? item.question ?? "").trim();
  if (!content) { warnings.push(`Question ${i + 1} skipped — empty content.`); return null; }

  const base: BulkQuestion = {
    type,
    content,
    points: Number(item.points ?? 10) || 10,
    timeLimit: Number(item.timeLimit ?? item.time_limit ?? 30) || 30,
    roundNumber: Number(item.roundNumber ?? item.round ?? item.round_number ?? 1) || 1,
  };

  if (type === "mcq") {
    const options = (Array.isArray(item.options) ? item.options : []).map((o: any) => String(o));
    while (options.length < 2) options.push("");
    let correct = Number(item.correctOption ?? item.correct_option ?? item.answerIndex ?? 0);
    if (typeof item.answer === "string") {
      const idx = options.findIndex((o: string) => o.toLowerCase() === item.answer.toLowerCase());
      if (idx >= 0) correct = idx;
    }
    if (correct < 0 || correct >= options.length) {
      warnings.push(`Question ${i + 1}: correct option out of range, defaulted to A.`);
      correct = 0;
    }
    base.options = options;
    base.correctOption = correct;
  } else {
    base.language = String(item.language || "javascript");
    base.testMode = (item.testMode || item.test_mode) === "assert" ? "assert" : "io";
    base.starterCode = String(item.starterCode ?? item.starter_code ?? "");
    base.solution = String(item.solution ?? "");
    base.testCases = normalizeTests(item.testCases ?? item.test_cases, warnings, `Question ${i + 1}`);
    if (base.testCases.length === 0) warnings.push(`Question ${i + 1}: no test cases — it cannot be auto-graded.`);
  }
  return base;
};

const parseQuizCsv = (text: string, warnings: string[]): BulkQuestion[] => {
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: BulkQuestion[] = [];
  rows.forEach((row, i) => {
    if (i === 0 && /^type\s*,/i.test(row)) return; // header
    const c = splitCsvLine(row);
    if (c.length < 3) { warnings.push(`Row ${i + 1} skipped — not enough columns.`); return; }
    const [type, content, points, timeLimit, round, optionsRaw, correct] = c;
    if ((type || "mcq").toLowerCase() === "code") {
      warnings.push(`Row ${i + 1} skipped — code questions must be imported as JSON (they need test cases).`);
      return;
    }
    const options = (optionsRaw || "").split("|").map((o) => o.trim()).filter(Boolean);
    const q = normalizeQuestion(
      { type: "mcq", content, points, timeLimit, roundNumber: round, options, correctOption: Number(correct ?? 0) },
      i,
      warnings
    );
    if (q) out.push(q);
  });
  return out;
};

export function parseQuizBulk(text: string): BulkResult<BulkQuiz> {
  const warnings: string[] = [];
  if (!text.trim()) return { ok: false, error: "Nothing to import.", warnings };

  const json = tryJson(text);
  if (json === null) {
    const questions = parseQuizCsv(text, warnings);
    if (questions.length === 0) return { ok: false, error: "No valid rows found. Use JSON or the CSV format shown below.", warnings };
    return { ok: true, data: { questions }, warnings };
  }

  const rawQuestions = Array.isArray(json) ? json : json.questions;
  if (!Array.isArray(rawQuestions)) {
    return { ok: false, error: 'JSON must be an array of questions, or an object with a "questions" array.', warnings };
  }

  const questions = rawQuestions
    .map((q: any, i: number) => normalizeQuestion(q, i, warnings))
    .filter((q): q is BulkQuestion => q !== null);
  if (questions.length === 0) return { ok: false, error: "No valid questions found.", warnings };

  const obj = Array.isArray(json) ? {} : json;
  const mode = String(obj.mode || "").toLowerCase();
  const rawRounds = Array.isArray(obj.rounds) ? obj.rounds : [];
  const rounds: BulkRound[] = rawRounds.map((r: any, i: number) => ({
    roundNumber: Number(r.roundNumber ?? r.round_number ?? i + 1) || i + 1,
    name: String(r.name || `Round ${i + 1}`),
    durationSeconds: Number(r.durationSeconds ?? r.duration_seconds ?? 300) || 300,
    cutoffType: (r.cutoffType ?? r.cutoff_type) === "top_pct" ? "top_pct" : "top_n",
    cutoffValue: Number(r.cutoffValue ?? r.cutoff_value ?? 10) || 10,
  }));

  const tournamentMode =
    obj.tournamentMode ?? obj.tournament ?? (mode.includes("tournament") ? true : undefined) ?? (rounds.length > 0 || undefined);
  const isEvaluation = obj.isEvaluation ?? obj.evaluation ?? (mode.includes("evaluation") ? true : undefined);

  return {
    ok: true,
    warnings,
    data: {
      title: obj.title ? String(obj.title) : undefined,
      description: obj.description ? String(obj.description) : undefined,
      tournamentMode: tournamentMode === undefined ? undefined : !!tournamentMode,
      isEvaluation: isEvaluation === undefined ? undefined : !!isEvaluation,
      rounds: rounds.length > 0 ? rounds : undefined,
      questions,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Lesson courses                                                      */
/* ------------------------------------------------------------------ */

export interface BulkLesson {
  title: string;
  concept_markdown: string;
  image_url: string;
  objective: string;
  hint: string;
  language: string;
  starter_code: string;
  solution: string;
  test_mode: "io" | "assert";
  test_cases: TestCase[];
}

export interface BulkCourse {
  title?: string;
  description?: string;
  subject?: string;
  cover_image_url?: string;
  lessons: BulkLesson[];
}

export function parseCourseBulk(text: string): BulkResult<BulkCourse> {
  const warnings: string[] = [];
  const json = tryJson(text);
  if (json === null) return { ok: false, error: "Lesson import must be JSON (an array of lessons or a course object).", warnings };

  const rawLessons = Array.isArray(json) ? json : json.lessons;
  if (!Array.isArray(rawLessons)) return { ok: false, error: 'JSON must be an array of lessons, or an object with a "lessons" array.', warnings };

  const lessons: BulkLesson[] = rawLessons
    .map((l: any, i: number) => {
      const title = String(l.title ?? "").trim();
      if (!title) { warnings.push(`Lesson ${i + 1} skipped — missing title.`); return null; }
      const lesson: BulkLesson = {
        title,
        concept_markdown: String(l.concept_markdown ?? l.concept ?? ""),
        image_url: String(l.image_url ?? l.image ?? ""),
        objective: String(l.objective ?? ""),
        hint: String(l.hint ?? ""),
        language: String(l.language ?? "javascript"),
        starter_code: String(l.starter_code ?? l.starterCode ?? ""),
        solution: String(l.solution ?? ""),
        test_mode: (l.test_mode ?? l.testMode) === "assert" ? "assert" : "io",
        test_cases: normalizeTests(l.test_cases ?? l.testCases, warnings, `Lesson ${i + 1}`),
      };
      if (lesson.test_cases.length === 0) warnings.push(`Lesson ${i + 1}: no test cases — learners cannot be auto-checked.`);
      return lesson;
    })
    .filter((l): l is BulkLesson => l !== null);

  if (lessons.length === 0) return { ok: false, error: "No valid lessons found.", warnings };

  const obj = Array.isArray(json) ? {} : (json.course ?? json);
  return {
    ok: true,
    warnings,
    data: {
      title: obj.title ? String(obj.title) : undefined,
      description: obj.description ? String(obj.description) : undefined,
      subject: obj.subject ? String(obj.subject) : undefined,
      cover_image_url: obj.cover_image_url ? String(obj.cover_image_url) : undefined,
      lessons,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Flashcards                                                          */
/* ------------------------------------------------------------------ */

export interface BulkCard { front: string; back: string }

export function parseFlashcardBulk(text: string): BulkCard[] {
  const json = tryJson(text);
  if (json !== null) {
    const raw = Array.isArray(json) ? json : json.cards;
    if (Array.isArray(raw)) {
      return raw
        .map((c: any) => ({
          front: String(c.front ?? c.term ?? c.question ?? "").trim(),
          back: String(c.back ?? c.definition ?? c.answer ?? "").trim(),
        }))
        .filter((c) => c.front && c.back);
    }
    return [];
  }
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.includes("\t") ? "\t" : line.includes("|") ? "|" : line.includes(" - ") ? " - " : ",";
      const idx = line.indexOf(sep);
      if (idx < 0) return null;
      const front = line.slice(0, idx).trim();
      const back = line.slice(idx + sep.length).trim();
      if (!front || !back) return null;
      return { front, back };
    })
    .filter((c): c is BulkCard => c !== null);
}

/* ------------------------------------------------------------------ */
/* Criteria scoring algorithm                                          */
/* ------------------------------------------------------------------ */

export interface CriteriaDimension {
  key: string;
  label: string;
  weight: number;
  keywords: string[];
}

export const DEFAULT_DIMENSIONS: CriteriaDimension[] = [
  { key: "creativity", label: "Creativity & Originality", weight: 30, keywords: ["original", "novel", "unique", "design", "idea", "innovat", "creative"] },
  { key: "problem_solving", label: "Problem Solving", weight: 30, keywords: ["solve", "algorithm", "approach", "debug", "optimi", "edge case", "trade-off", "because"] },
  { key: "brief_alignment", label: "Brief Alignment", weight: 25, keywords: [] },
  { key: "communication", label: "Clarity & Communication", weight: 15, keywords: ["explain", "structure", "step", "first", "then", "finally", "therefore"] },
];

const STOP = new Set(["the","and","for","that","with","this","from","have","will","your","they","them","been","are","was","not","but","you","our","its","can","all","into","use","using","when","what","how","why"]);

const tokens = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));

/**
 * Deterministic rubric scoring. Each dimension is scored 0-100 from the
 * submission text (depth, vocabulary variety, keyword evidence and overlap
 * with the project brief), then combined using the setter's weights.
 */
export function scoreSubmission(
  submission: string,
  brief: string,
  dimensions: CriteriaDimension[]
): { scores: Record<string, number>; total: number } {
  const text = submission.toLowerCase();
  const words = tokens(submission);
  const wordCount = words.length;
  const unique = new Set(words).size;
  const variety = wordCount === 0 ? 0 : unique / wordCount;
  const depth = Math.min(1, wordCount / 250);

  const briefWords = new Set(tokens(brief));
  const overlap = briefWords.size === 0
    ? 0.6
    : [...briefWords].filter((w) => text.includes(w)).length / briefWords.size;

  const scores: Record<string, number> = {};
  for (const d of dimensions) {
    let base: number;
    if (d.key === "brief_alignment" || d.keywords.length === 0) {
      base = 0.25 + overlap * 0.6 + depth * 0.15;
    } else {
      const hits = d.keywords.filter((k) => text.includes(k)).length / d.keywords.length;
      base = 0.2 + hits * 0.45 + depth * 0.2 + variety * 0.15;
    }
    scores[d.key] = Math.max(0, Math.min(100, Math.round(base * 100)));
  }

  const totalWeight = dimensions.reduce((a, d) => a + (d.weight || 0), 0) || 1;
  const total = Math.round(
    dimensions.reduce((a, d) => a + (scores[d.key] ?? 0) * (d.weight || 0), 0) / totalWeight
  );
  return { scores, total };
}
