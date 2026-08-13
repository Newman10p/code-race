import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderOpen, BookOpen, Plus, Play, Users, Shield, Code, ListChecks, Zap, AlertTriangle, Trophy, Maximize, Palette, Bot, Layers, Megaphone, GraduationCap, Lock, FileBarChart } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect } from "react";

export const Route = createFileRoute("/manual")({
  component: ManualPage,
});

function ManualPage() {
  const { isSetter, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isSetter) navigate({ to: "/learn" });
  }, [loading, isSetter, navigate]);

  if (loading || !isSetter) {
    return (
      <HoneycombLayout>
        <Navbar />
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </HoneycombLayout>
    );
  }

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">
            <span className="text-primary">CodeRace</span> Setter Manual
          </h1>
        </div>

        {/* Table of Contents */}
        <GlowCard className="mb-8">
          <h2 className="font-semibold mb-3">📑 Table of Contents</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li><a href="#overview" className="text-primary hover:underline">Platform Overview</a></li>
            <li><a href="#folders" className="text-primary hover:underline">Managing Folders</a></li>
            <li><a href="#quizzes" className="text-primary hover:underline">Creating & Editing Quizzes</a></li>
            <li><a href="#questions" className="text-primary hover:underline">Question Types</a></li>
            <li><a href="#bulk" className="text-primary hover:underline">Bulk Import</a></li>
            <li><a href="#launching" className="text-primary hover:underline">Launching a Race</a></li>
            <li><a href="#hosting" className="text-primary hover:underline">Hosting a Live Race</a></li>
            <li><a href="#anticheat" className="text-primary hover:underline">Anti-Cheat System</a></li>
            <li><a href="#tournament" className="text-primary hover:underline">Tournament Mode (Rounds)</a></li>
            <li><a href="#evaluation" className="text-primary hover:underline">Evaluation / Assessment Mode</a></li>
            <li><a href="#reports" className="text-primary hover:underline">Performance Reports</a></li>
            <li><a href="#authjoin" className="text-primary hover:underline">Sign-in Required to Join</a></li>
            <li><a href="#announcements" className="text-primary hover:underline">Announcements</a></li>
            <li><a href="#tutorial" className="text-primary hover:underline">Learner Tutorial</a></li>
            <li><a href="#fullscreen" className="text-primary hover:underline">Fullscreen Security</a></li>
            <li><a href="#flashcards" className="text-primary hover:underline">Flashcards for Learners</a></li>
            <li><a href="#lessons" className="text-primary hover:underline">Interactive Lesson Courses</a></li>
            <li><a href="#code-questions" className="text-primary hover:underline">Code Questions & Test Cases</a></li>
            <li><a href="#themes" className="text-primary hover:underline">Theme Picker</a></li>
            <li><a href="#ai" className="text-primary hover:underline">AI Assistant</a></li>
            <li><a href="#leaderboard" className="text-primary hover:underline">Leaderboard & Scoring</a></li>
            <li><a href="#criteria" className="text-primary hover:underline">Criteria & Rubrics (Creativity / Problem Solving)</a></li>
            <li><a href="#hub-admin" className="text-primary hover:underline">Student Hub — Moderation, Code Space & Arena</a></li>
            <li><a href="#tips" className="text-primary hover:underline">Tips & Best Practices</a></li>
          </ol>
        </GlowCard>

        <div className="space-y-6">
          {/* 1. Overview */}
          <GlowCard id="overview">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Zap className="h-5 w-5 text-primary" /> 1. Platform Overview
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              CodeRace is a real-time competitive quiz platform designed for ICT education. As a setter, you create quizzes organized in folders, then launch live "races" where students compete by answering questions as fast as possible.
            </p>
            <div className="rounded-lg border border-border bg-card/50 p-4 text-sm">
              <p className="font-medium mb-1">Key Concepts:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Folders</strong> – Organize your quizzes by topic (e.g., "Networking", "Python Basics")</li>
                <li><strong>Quizzes</strong> – A set of questions with custom point values</li>
                <li><strong>Race</strong> – A live session where students compete in real-time</li>
                <li><strong>PIN</strong> – A 6-digit code students use to join your race</li>
              </ul>
            </div>
          </GlowCard>

          {/* 2. Folders */}
          <GlowCard id="folders">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <FolderOpen className="h-5 w-5 text-primary" /> 2. Managing Folders
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p><strong>Creating a folder:</strong> Click the <span className="text-primary font-medium">"+ New Folder"</span> button on the Dashboard. Type a descriptive name and press Enter or click Create.</p>
              <p><strong>Opening a folder:</strong> Click on any folder card to see its quizzes.</p>
              <p><strong>Deleting a folder:</strong> Hover over a folder and click the red trash icon. <span className="text-destructive">Warning: This deletes ALL quizzes and questions inside it.</span></p>
            </div>
          </GlowCard>

          {/* 3. Quizzes */}
          <GlowCard id="quizzes">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <BookOpen className="h-5 w-5 text-primary" /> 3. Creating & Editing Quizzes
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p><strong>Create a quiz:</strong> Inside a folder, click <span className="text-primary font-medium">"+ Create Quiz"</span>. Fill in the title and description.</p>
              <p><strong>Edit a quiz:</strong> Click the "Edit" button next to any quiz to modify its title, description, or questions.</p>
              <p><strong>Save:</strong> Always click <span className="text-primary font-medium">"Save Quiz"</span> when you're done. Unsaved changes are lost.</p>
              <p><strong>Delete a quiz:</strong> Click the trash icon next to the quiz in the folder view.</p>
            </div>
          </GlowCard>

          {/* 4. Questions */}
          <GlowCard id="questions">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <ListChecks className="h-5 w-5 text-primary" /> 4. Question Types
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <h3 className="flex items-center gap-2 font-semibold mb-2">
                  <ListChecks className="h-4 w-4 text-primary" /> MCQ (Multiple Choice)
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>4 options (A, B, C, D)</li>
                  <li>Click a letter button to set the correct answer (it turns blue)</li>
                  <li>Set custom point values per question</li>
                  <li>Students see instant feedback after submitting</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <h3 className="flex items-center gap-2 font-semibold mb-2">
                  <Code className="h-4 w-4 text-primary" /> Code Completion
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Provide starter code with blanks</li>
                  <li>Add the solution for reference</li>
                  <li>Students write code in a monospace editor</li>
                  <li>Code answers are submitted as text (manual grading)</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <p className="font-medium text-primary mb-1">💡 Points:</p>
              <p className="text-muted-foreground">Each question has its own point value (default: 10). Use the point input next to each question to adjust. Higher points = harder questions.</p>
            </div>
          </GlowCard>

          {/* 5. Bulk Import */}
          <GlowCard id="bulk">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Plus className="h-5 w-5 text-primary" /> 5. Bulk Import Formats
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Click <span className="text-primary font-medium">"ICT Bulk Upload"</span> in the quiz editor, then pick the format tab:
                Normal Quiz, Tournament, Evaluation, or Tournament Evaluation. You can paste text or upload a
                <code> .json</code> / <code>.csv</code> file. Anything declared inside the file (mode, rounds, evaluation) overrides the tab.
              </p>

              <p><strong>A. Normal quiz — JSON array (MCQ + code with test cases):</strong></p>
              <pre className="rounded-lg border border-input bg-background p-3 font-mono text-xs overflow-x-auto">
{`[
  {
    "type": "mcq",
    "content": "What layer is HTTP?",
    "points": 10,
    "timeLimit": 30,
    "options": ["Layer 1", "Layer 4", "Layer 7", "Layer 3"],
    "correctOption": 2
  },
  {
    "type": "code",
    "content": "Complete the function:",
    "points": 20,
    "language": "python",
    "testMode": "io",
    "starterCode": "def add(a, b):\\n    pass",
    "solution": "def add(a, b):\\n    return a + b",
    "testCases": [
      { "name": "adds", "stdin": "2 3", "expected": "5" },
      { "name": "hidden", "stdin": "10 1", "expected": "11", "is_hidden": true }
    ]
  }
]`}
              </pre>

              <p><strong>B. Tournament — wrap questions in an object with rounds:</strong></p>
              <pre className="rounded-lg border border-input bg-background p-3 font-mono text-xs overflow-x-auto">
{`{
  "mode": "tournament",
  "title": "ICT Championship",
  "rounds": [
    { "roundNumber": 1, "name": "Qualifiers", "durationSeconds": 300,
      "cutoffType": "top_n", "cutoffValue": 10 },
    { "roundNumber": 2, "name": "Finals", "durationSeconds": 420,
      "cutoffType": "top_pct", "cutoffValue": 50 }
  ],
  "questions": [
    { "type": "mcq", "content": "Binary of 10?", "roundNumber": 1,
      "options": ["1010","1100","1001","1110"], "correctOption": 0 }
  ]
}`}
              </pre>

              <p>
                <strong>C. Evaluation:</strong> same as A or B, but set <code>"mode": "evaluation"</code>.
                <strong> D. Tournament Evaluation:</strong> set <code>"mode": "tournament evaluation"</code> and include a
                <code> rounds</code> array — you get round cutoffs plus the full per-learner performance report.
              </p>

              <p><strong>E. CSV (MCQ only — code questions need JSON for their test cases):</strong></p>
              <pre className="rounded-lg border border-input bg-background p-3 font-mono text-xs overflow-x-auto">
{`type,content,points,timeLimit,round,options,correctIndex
mcq,"What does CPU stand for?",10,30,1,"Central Processing Unit|Computer Power Unit|Core Print Unit|Central Program Unit",0`}
              </pre>

              <p><strong>F. Test case fields</strong> — I/O mode: <code>name</code>, <code>stdin</code>, <code>expected</code>, <code>is_hidden</code>.
                Assertion mode: <code>name</code>, <code>code</code> (the assertion), <code>is_hidden</code>. Set the question's
                <code> testMode</code> to <code>"io"</code> or <code>"assert"</code>.</p>

              <p><strong>G. Lesson courses</strong> — in the lesson creator click "Bulk Import Lessons":</p>
              <pre className="rounded-lg border border-input bg-background p-3 font-mono text-xs overflow-x-auto">
{`{
  "course": { "title": "Intro to Python", "subject": "Programming",
              "description": "Start coding" },
  "lessons": [
    { "title": "Variables",
      "concept_markdown": "A variable stores a value...",
      "objective": "Print the value of x",
      "hint": "Use print()",
      "language": "python",
      "starter_code": "x = 5\\n",
      "solution": "x = 5\\nprint(x)",
      "test_mode": "io",
      "test_cases": [{ "name": "prints 5", "expected": "5" }] }
  ]
}`}
              </pre>

              <p><strong>H. Flashcards</strong> — Settings → Flashcard Sets → Bulk import. One card per line
                (<code>front, back</code> / <code>front | back</code> / tab-separated), or JSON:</p>
              <pre className="rounded-lg border border-input bg-background p-3 font-mono text-xs overflow-x-auto">
{`[{ "front": "RAM", "back": "Random Access Memory" }]`}
              </pre>

              <p className="text-xs">
                Editing a course now updates lessons in place — learners keep their progress and never have to redo the course.
              </p>
            </div>
          </GlowCard>

          {/* 6. Launching */}
          <GlowCard id="launching">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Play className="h-5 w-5 text-primary" /> 6. Launching a Race
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to a folder and find the quiz you want to launch.</li>
                <li>Click the <span className="text-primary font-medium">"Launch"</span> button next to the quiz.</li>
                <li>A 6-digit PIN will be generated and displayed on screen.</li>
                <li>Share this PIN with your students (display on projector, read aloud, or copy).</li>
                <li>Students go to the homepage and click <span className="text-primary font-medium">"Join a Race"</span>, then enter the PIN and their name.</li>
                <li>You'll see students appear in the lobby in real-time.</li>
                <li>When ready, click <span className="text-primary font-medium">"Start Race"</span>.</li>
              </ol>
            </div>
          </GlowCard>

          {/* 7. Hosting */}
          <GlowCard id="hosting">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Users className="h-5 w-5 text-primary" /> 7. Hosting a Live Race
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Once the race starts:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>The current question is shown on your screen with a live leaderboard.</li>
                <li>Click <span className="text-primary font-medium">"Next Question →"</span> to advance all students to the next question.</li>
                <li>Students can only see and answer the current question.</li>
                <li>The leaderboard updates in real-time as students submit answers.</li>
                <li>After the last question, click "Finish Race" to end the session.</li>
                <li>Use the "End" button to finish the race early at any time.</li>
              </ul>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="font-medium text-primary mb-1">💡 Pro Tip:</p>
                <p>Display the launch screen on a projector so students can see the PIN and leaderboard. Control the pace by advancing questions when you're ready.</p>
              </div>
            </div>
          </GlowCard>

          {/* 8. Anti-Cheat */}
          <GlowCard id="anticheat">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Shield className="h-5 w-5 text-primary" /> 8. Anti-Cheat System
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>CodeRace includes a built-in anti-cheat system using the browser's Visibility API:</p>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <h4 className="flex items-center gap-2 font-semibold text-destructive mb-2">
                  <AlertTriangle className="h-4 w-4" /> What Happens When a Student Switches Tabs:
                </h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Their current answer is <strong>auto-submitted immediately</strong></li>
                  <li>The answer is marked as <strong>"Flagged: Tab Switch"</strong></li>
                  <li>A full-screen warning overlay appears: <em>"Tab Switch Detected: Answer Auto-Submitted"</em></li>
                  <li>Their <strong>tab switch count increases</strong></li>
                  <li>A <AlertTriangle className="inline h-3 w-3 text-destructive" /> flag icon appears next to their name on the leaderboard</li>
                </ol>
              </div>
              <p>As the setter, you can see flagged students on the leaderboard with the warning icon. Hover to see the number of tab switches.</p>
            </div>
          </GlowCard>

          {/* Tournament Mode */}
          <GlowCard id="tournament">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Trophy className="h-5 w-5 text-primary" /> Tournament Mode (Rounds)
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>In the quiz editor, toggle <strong>Tournament Rounds</strong> to group questions into elimination rounds.</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Assign each question a <code>round_number</code> (Round 1, 2, 3…).</li>
                <li>Per-round timer (e.g. 5 min) and qualification cutoff (top N or score threshold) advance only qualifiers.</li>
                <li>Eliminated participants enter <strong>Spectator Mode</strong> at <code>/standings</code> — they can still watch the live leaderboard.</li>
                <li>Animated round transitions play between rounds; auto-advance moves players to the next question once feedback is shown.</li>
                <li>The host can set a single global quiz duration in launch settings.</li>
              </ul>
            </div>
          </GlowCard>

          {/* Fullscreen Security */}
          <GlowCard id="fullscreen">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Maximize className="h-5 w-5 text-primary" /> Fullscreen Security
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Live races require participants to be in fullscreen on a desktop browser:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Mobile is blocked entirely</strong> — participants must use a laptop/desktop.</li>
                <li>Exiting fullscreen issues a <strong>strike</strong> after a short debounce (so brief transitions or reloads don't count). A second exit triggers <strong>disqualification</strong>.</li>
                <li>On the first strike, a full-screen warning appears with a <strong>10-second countdown</strong> and a "Return to Fullscreen" button. Return in time to stay in the race.</li>
                <li>Tab switches still auto-submit the current answer and flag the participant.</li>
                <li>Disqualified players are moved to the spectator standings view.</li>
                <li>Page reloads and navigation away are detected and do <strong>not</strong> count as strikes.</li>
              </ul>
            </div>
          </GlowCard>

          {/* Evaluation Mode */}
          <GlowCard id="evaluation">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Trophy className="h-5 w-5 text-primary" /> Evaluation / Assessment Mode
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Evaluation mode turns a quiz into a live <strong>assessment</strong> for performance checking and grading.</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Toggle <strong>Evaluation / Assessment Mode</strong> in the quiz editor (mutually exclusive with Tournament).</li>
                <li>Plays live like a standard race with the same fullscreen & anti-cheat rules.</li>
                <li>At the end, every learner sees a <strong>per-question breakdown</strong>: correct, wrong, or skipped, plus points and accuracy percentage.</li>
                <li>The AI Assistant can create evaluations for you — just ask for a "test", "assessment", or "evaluation".</li>
                <li>Quizzes flagged as evaluations show an <span className="text-primary font-semibold">EVALUATION</span> badge in the folder view.</li>
              </ul>
            </div>
          </GlowCard>

          {/* Performance Reports */}
          <GlowCard id="reports">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <FileBarChart className="h-5 w-5 text-primary" /> Performance Reports
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Every live session — race, tournament, or evaluation — now has a
                <strong> full report</strong> at{" "}
                <code>/report?sessionId=…</code>. Open it from the Launch page via the{" "}
                <span className="text-primary font-medium">Report</span> button.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Ranking by performance</strong> — sorted by accuracy, with score as tie-breaker.</li>
                <li><strong>Per-question difficulty</strong> — see which questions the class struggled with (colour-coded pass rate).</li>
                <li><strong>Answer grid</strong> — for each learner, a check / cross / dash per question so you can spot patterns fast.</li>
                <li><strong>CSV export</strong> — one-click download for your gradebook.</li>
                <li>Updates in real time as answers come in — leave it open during the race.</li>
              </ul>
            </div>
          </GlowCard>

          {/* Sign-in Required */}
          <GlowCard id="authjoin">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Lock className="h-5 w-5 text-primary" /> Sign-in Required to Join
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                To keep races fair, every participant must be signed in. The <code>/join</code> page now
                shows a sign-in gate for anonymous visitors and pre-fills the participant name from their
                profile.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Each user can join a given race <strong>only once</strong> — a database-level unique constraint blocks duplicate entries.</li>
                <li>If a signed-in learner rejoins by accident (e.g. after a refresh), they land back on their existing participant instead of a new one.</li>
                <li>Anonymous joins are no longer possible — the "Sign in to Join" panel replaces the PIN form until they authenticate.</li>
              </ul>
            </div>
          </GlowCard>

          {/* Announcements */}
          <GlowCard id="announcements">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Megaphone className="h-5 w-5 text-primary" /> Announcements
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Post product updates that pop up as a modal on every signed-in user's screen. Perfect for
                announcing "new evaluation mode", schedule changes, or reminders.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Open <strong>Announcements</strong> in the top navigation.</li>
                <li>Click <strong>New Announcement</strong>, add a title + body, and Publish.</li>
                <li>The popup appears once per user with an <strong>OK</strong> button; dismissals are stored so no one sees the same message twice.</li>
                <li>Toggle an announcement <em>Off</em> to stop delivery; toggle it back <em>On</em> to resurface it to anyone who hasn't already dismissed it.</li>
              </ul>
            </div>
          </GlowCard>

          {/* Learner Tutorial */}
          <GlowCard id="tutorial">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <GraduationCap className="h-5 w-5 text-primary" /> Learner Tutorial
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                First-time learners now see a short 5-step interactive walkthrough covering flashcards,
                joining races, tournaments, evaluations, and fair-play rules. It auto-appears once, and
                the completion timestamp is stored on their profile so it never bothers them again.
              </p>
              <p>
                Learners can also skip any step; skipping still marks the tutorial as complete.
              </p>
            </div>
          </GlowCard>

          {/* Flashcards */}
          <GlowCard id="flashcards">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Layers className="h-5 w-5 text-primary" /> Flashcards for Learners
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Setters can publish flashcard sets that learners study from their dashboard at <code>/learn</code>.</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Go to <strong>Settings → Flashcard Sets → New Set</strong>.</li>
                <li>Bulk import: paste one card per line as <code>front, back</code>, <code>front | back</code>, or tab-separated.</li>
                <li>New sets start as <strong>drafts</strong> (private). Click <strong>Publish</strong> on the set to make it visible to learners.</li>
                <li>Public sets appear in every learner's library and can be bookmarked. <strong>Unpublish</strong> anytime to pull it back.</li>
                <li>Ask the AI Assistant to draft flashcards from a topic and publish them for you.</li>
              </ul>
            </div>
          </GlowCard>

          {/* Lessons */}
          <GlowCard id="lessons">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <GraduationCap className="h-5 w-5 text-primary" /> Interactive Lesson Courses
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Build guided, hands-on coding lessons. Learners see a three-column workbench: <strong>concept + objective</strong> on the left, a full <strong>Monaco (VS Code) editor</strong> in the middle, and <strong>live output / preview</strong> on the right.</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Click <strong>New Lesson Course</strong> on the dashboard (or ask the AI Assistant to draft an outline).</li>
                <li>Each lesson has: concept (markdown), objective, optional hint (unlocked after a failed run), starter code, and test cases.</li>
                <li>Languages: <strong>JavaScript</strong>, <strong>Python</strong> (Pyodide), <strong>HTML/CSS</strong> (live preview).</li>
                <li>Test modes: <strong>I/O</strong> (compare stdout to expected) or <strong>Assertion</strong> (write test code that throws on failure).</li>
                <li>Progress is saved per learner; the next lesson unlocks after the current one passes all tests.</li>
                <li>Manage your courses on the dashboard: edit, publish/unpublish, preview, or delete.</li>
              </ul>
            </div>
          </GlowCard>

          {/* Code questions */}
          <GlowCard id="code-questions">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Code className="h-5 w-5 text-primary" /> Code Questions & Test Cases
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Code questions in quizzes, tournaments, and evaluations now use the same Monaco editor. Setters pick a language and add test cases; learners get partial credit based on how many tests pass.</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Add a code question in the quiz creator, choose a language, then add tests (I/O pairs or assertions).</li>
                <li>Mark tests as <strong>hidden</strong> to prevent learners from seeing the expected output.</li>
                <li>Score = <code>(passed / total) × points</code> — partial credit is automatic.</li>
                <li>The evaluation report shows per-test pass/fail per learner.</li>
                <li>The AI Assistant can generate code questions with language + test cases on request.</li>
              </ul>
            </div>
          </GlowCard>

          {/* Themes */}
          <GlowCard id="hub-admin">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Palette className="h-5 w-5 text-primary" /> Student Hub — moderation &amp; code space
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p><strong>Hub admin</strong> in your navbar opens the control center. It has four tabs:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong>Reports</strong> — every report students file, with severity, category and who filed it. Type a reason (required) and move the report through new → under review → escalated → action taken / resolved / dismissed.</li>
                <li><strong>Groups</strong> — set any group to active, frozen (read-only) or archived. A reason is required.</li>
                <li><strong>Policies</strong> — switch student group creation, approval-before-live, the discover directory, private chat, mutual approval, blocking and reporting on or off. Two emergency switches freeze all group messaging or all group creation instantly. You also cap how many chat requests a student may send per hour.</li>
                <li><strong>Audit log</strong> — an immutable record of every administrative action: who, what, when and why. Message contents are never copied into it.</li>
              </ul>
              <p>Students get a <strong>Code space</strong> tab inside the hub: a scratch workbench with the same editor and runner used in races (JavaScript, Python, HTML/CSS). They run code in the browser and can share the result straight into a group conversation as a highlighted code block.</p>
              <p><strong>Code arena</strong> is the competition tab. Group owners, moderators and patrons create a mini competition (title, brief, language, duration), then press <em>Start sprint</em> to open the timer for everyone in that group. Members solve the brief in the built-in editor, run it, paste their output and submit once — resubmits overwrite the same entry.</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong>Scoring</strong> — a clean run scores 100 base (40 otherwise) plus a speed bonus of up to 100 based on how early in the window the entry lands.</li>
                <li><strong>Leaderboard</strong> — updates live for the whole group; once the sprint is ended, everyone can read each other's submitted code to compare approaches.</li>
                <li><strong>XP & badges</strong> — 50 XP for a clean submission, 20 otherwise, plus badges such as <em>First finisher</em> and <em>Sprinter</em>. Hub XP leaders appear on the arena page.</li>
                <li><strong>Control</strong> — only group managers can start or end a sprint, and only members of that group can see or enter it.</li>
              </ul>
            </div>
          </GlowCard>

          <GlowCard id="themes">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Palette className="h-5 w-5 text-primary" /> Theme Picker
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Open <strong>Settings → Theme Color</strong> and pick Cyan, Blue, Red, Purple, or Yellow. Your choice is saved to your profile and follows you across devices. The honeycomb background glows in the active theme color around your mouse cursor.</p>
            </div>
          </GlowCard>

          {/* AI Assistant */}
          <GlowCard id="ai">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Bot className="h-5 w-5 text-primary" /> AI Assistant
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Click the floating <strong>bot icon</strong> (bottom-right) to open the AI assistant. It can help you draft questions, design rounds, build evaluations, manage flashcards, and explain concepts.</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Memory:</strong> the last 30 messages persist locally so the assistant remembers your conversation.</li>
                <li><strong>Resize/Expand:</strong> use the maximize button for a full-screen workspace.</li>
                <li><strong>Clear history:</strong> the trash icon resets memory.</li>
                <li><strong>Can create for you:</strong> standard quizzes, tournaments, <strong>evaluation tests</strong>, and flashcard sets (always with your explicit confirmation).</li>
                <li><strong>Publishing:</strong> ask the assistant to publish or unpublish any of your flashcard sets.</li>
                <li><strong>Lesson courses:</strong> the assistant can draft an outline, then create the full interactive course (with starter code + tests) once you approve.</li>
                <li><strong>Code questions:</strong> the assistant can add code questions with language + test cases directly into a quiz or evaluation.</li>
              </ul>
            </div>
          </GlowCard>

          {/* Leaderboard (real section) */}
          <GlowCard id="leaderboard">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Trophy className="h-5 w-5 text-primary" /> Leaderboard & Scoring
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li>Points are awarded based on the question's point value</li>
                <li>MCQ: Full points for correct answer, 0 for incorrect</li>
                <li>Code: Points are awarded at setter's discretion (manual review)</li>
                <li>The leaderboard ranks students by total score in descending order</li>
                <li>Students see a mini-leaderboard (top 5) during the race</li>
                <li>The full leaderboard is shown after the race finishes</li>
              </ul>
            </div>
          </GlowCard>

          {/* Criteria & Rubrics */}
          <GlowCard id="criteria">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <FileBarChart className="h-5 w-5 text-primary" /> Criteria & Rubrics
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Open <span className="text-primary font-medium">Criteria</span> from the dashboard to grade open-ended project work
                on creativity and problem solving instead of right/wrong answers.
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li><strong>Upload the brief:</strong> paste the project description or upload a <code>.txt</code>/<code>.md</code> file. The brief is what submissions are compared against.</li>
                <li><strong>Set the algorithm:</strong> each criterion has a label, a weight (%) and optional evidence keywords. Defaults are Creativity &amp; Originality (30%), Problem Solving (30%), Brief Alignment (25%) and Clarity &amp; Communication (15%). Keep the weights totalling 100%.</li>
                <li><strong>Set the passing score</strong> and publish the rubric when you want learners to see it.</li>
                <li><strong>Score submissions:</strong> paste or upload a learner's write-up/code, press <em>Run Algorithm</em>, review the per-criterion bars, then <em>Save Result</em>.</li>
                <li><strong>Ranked results:</strong> every saved submission appears ranked by weighted total, with pass/below-cutoff status and a criterion breakdown.</li>
              </ol>
              <p className="text-xs">
                How the score is derived: each criterion blends keyword evidence, answer depth, vocabulary variety and overlap with your
                brief into a 0–100 value; the final grade is the weighted average of those values. Adjust weights and keywords to tune it
                to your subject.
              </p>
            </div>
          </GlowCard>

          {/* 10. Tips */}
          <GlowCard id="tips">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
              <Zap className="h-5 w-5 text-primary" /> 10. Tips & Best Practices
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Prepare quizzes in advance:</strong> Create and organize quizzes before class. Use bulk import for large question sets.</li>
                <li><strong>Mix question types:</strong> Alternate between MCQ and Code questions to keep students engaged.</li>
                <li><strong>Vary point values:</strong> Assign more points to harder questions to reward effort.</li>
                <li><strong>Test your quiz first:</strong> Open two browser windows—one as setter, one as student—to verify everything works.</li>
                <li><strong>Display the PIN prominently:</strong> Use a projector to show the PIN screen so all students can see it.</li>
                <li><strong>Pace your questions:</strong> Don't rush. Give students time to read and answer before advancing.</li>
                <li><strong>Review flagged students:</strong> After the race, check for flagged students and discuss academic integrity.</li>
                <li><strong>Organize by topic:</strong> Use folders to group related quizzes (e.g., "Week 1", "Midterm Review").</li>
                <li><strong>Answers stay hidden:</strong> during a race learners only see whether their own pick was right or wrong — the correct option is never revealed on screen.</li>
              </ul>
            </div>
          </GlowCard>
        </div>
      </main>
    </HoneycombLayout>
  );
}
