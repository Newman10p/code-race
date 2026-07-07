This is a large update. I'll ship it in one turn but broken into three coherent parts. Confirm and I'll build.

## Part 1 — VS Code-like code questions with test cases

**Editor upgrade** (used in quiz create, race gameplay, and lessons)
- Swap the current `<textarea>` for **Monaco Editor** (`@monaco-editor/react`) — same engine as VS Code.
- Dark theme matching the cyber design tokens, line numbers, syntax highlighting, bracket matching, auto-indent, minimap off, keyboard shortcuts (Ctrl+Enter to run).
- Language picker per question: **JavaScript, Python, HTML/CSS**. (Rust in-browser needs a ~15MB WASM toolchain per session — I'll skip it in v1 and add a "Rust coming soon" note; can add later if you accept the payload cost.)

**Test cases** — setter picks per question:
- **I/O pairs**: rows of `{ stdin, expected_stdout, is_hidden }`. Runner compares trimmed stdout.
- **Assertion mode**: setter writes test code (e.g. `assert(add(2,3) === 5)`); runner appends it to the user's code.

**Runners** (all client-side, no exec service):
- JS/TS → sandboxed Web Worker with captured `console.log`.
- Python → Pyodide loaded lazily on first Python run (cached across questions).
- HTML/CSS → sandboxed `<iframe srcDoc>` live preview; tests via DOM queries in a hidden iframe.

**Schema additions** (migration):
- `questions`: add `language TEXT` (js/python/html), `test_mode TEXT` (io/assert), `test_cases JSONB` (array), `visible_test_count INT`.
- `participant_answers`: add `test_results JSONB` (per-case pass/fail for the report).

**Gameplay changes** (`race.tsx`):
- Code questions render as 2-pane: editor + output panel with a "Run tests" button showing per-test pass/fail (hidden tests shown as "Hidden test #2 ✓").
- Submission stores `test_results`; scoring = `(passed / total) * points` (partial credit) instead of all-or-nothing.
- Evaluation report shows per-test breakdown per learner.

## Part 2 — Lessons (learner + setter)

**Data model** (migration):
- `lesson_courses` (setter_id, title, description, subject, is_public, cover_image_url)
- `lessons` (course_id, order_index, title, concept_markdown, image_url, objective, hint, language, starter_code, solution, test_mode, test_cases JSONB)
- `lesson_progress` (user_id, lesson_id, completed_at, attempts)
- `learner_saved_courses` (user_id, course_id) for bookmarking

**Setter side**:
- New route `/lessons/create` and `/lessons/:courseId/edit` — course metadata + drag-to-reorder lesson list + per-lesson editor (concept markdown, image upload, objective, hint, starter code, tests).
- AI assistant gets `create_lesson_course`, `generate_lesson_outline_preview`, `add_lessons_to_course` tools (mirroring the flashcard pattern with explicit-consent-before-save).

**Learner side** (`/learn` already exists — extend it):
- Add a "Lessons" tab alongside flashcards.
- Course card grid → click into course → lesson list → lesson player.

**Lesson player** (`/learn/lesson/:lessonId`) — three-column layout per your spec:
- **Left**: title, markdown concept, image, big objective card, collapsible hint (unlocks after first failed run to encourage effort — small twist on your spec).
- **Center**: Monaco editor with starter code, line numbers.
- **Right**: iframe live preview (HTML) or terminal-style output (JS/Python), with typewriter reveal for stdout.
- **Bottom bar**: gradient "Run Code" button, grayed "Next Lesson →" button.
- **Animations**: framer-motion — column slide-in on mount, green checkmark burst + confetti on pass, red shake on fail, glowing pulse on the Next button when it unlocks, progress dots at the top filling in.
- Completion writes `lesson_progress`, unlocks Next.

## Part 3 — Fullscreen hardening

- Audit `useFullscreen.tsx` for the specific bug pattern that keeps recurring: race conditions between `fullscreenchange` event, cross-browser prefixed properties (`webkitFullscreenElement`), and React state.
- Add a 500ms debounce on the "exited fullscreen" detection so brief browser-triggered exits (permission prompts, Monaco's own fullscreen widget, iframe focus swaps) don't trigger disqualification.
- Add an explicit `document.visibilityState === 'hidden'` check separately, so tab-switching is what disqualifies — not browser chrome flicker.
- Test on the race flow after the Monaco integration (Monaco has its own fullscreen widget that was likely part of the recurring bug).

## Manual updates

Add sections for: VS Code editor + test cases in quizzes, evaluation report with per-test breakdown, Lessons (learner interaction + setter creation + AI-created lessons).

## New dependencies

`@monaco-editor/react`, `framer-motion` (if not already), `canvas-confetti`, Pyodide loaded from CDN on demand.

## What I'm NOT doing (unless you say otherwise)

- Rust support (payload cost).
- Real-time collaborative editing in lessons.
- Video lessons.
- Certificates / gamified XP for lessons (can add later).

Reply "go" and I'll implement all three parts.