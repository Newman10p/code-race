import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderOpen, BookOpen, Plus, Play, Users, Shield, Code, ListChecks, Zap, AlertTriangle, Trophy, Maximize, Palette, Bot, Layers } from "lucide-react";
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
            <li><a href="#fullscreen" className="text-primary hover:underline">Fullscreen Security</a></li>
            <li><a href="#flashcards" className="text-primary hover:underline">Flashcards for Learners</a></li>
            <li><a href="#themes" className="text-primary hover:underline">Theme Picker</a></li>
            <li><a href="#ai" className="text-primary hover:underline">AI Assistant</a></li>
            <li><a href="#leaderboard" className="text-primary hover:underline">Leaderboard & Scoring</a></li>
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
              <Plus className="h-5 w-5 text-primary" /> 5. Bulk Import (JSON)
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Click <span className="text-primary font-medium">"ICT Bulk Upload"</span> in the quiz editor to paste a JSON array of questions.</p>
              <p><strong>JSON Format:</strong></p>
              <pre className="rounded-lg border border-input bg-background p-3 font-mono text-xs overflow-x-auto">
{`[
  {
    "type": "mcq",
    "content": "What layer is HTTP?",
    "points": 10,
    "options": ["Layer 1", "Layer 4", "Layer 7", "Layer 3"],
    "correctOption": 2
  },
  {
    "type": "code",
    "content": "Complete the function:",
    "points": 20,
    "starterCode": "def add(a, b):\\n    pass",
    "solution": "def add(a, b):\\n    return a + b"
  }
]`}
              </pre>
              <p className="text-xs"><strong>Fields:</strong> <code>type</code> ("mcq" or "code"), <code>content</code> (question text), <code>points</code>, <code>options</code> (array of 4 strings for MCQ), <code>correctOption</code> (0-3 index), <code>starterCode</code>, <code>solution</code>.</p>
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
                <li>Exiting fullscreen issues a <strong>strike</strong>. After 3 strikes the participant is <strong>disqualified</strong>.</li>
                <li>Tab switches still auto-submit the current answer and flag the participant.</li>
                <li>Disqualified players are moved to the spectator standings view.</li>
              </ul>
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
                <li>Public sets appear in every learner's library and can be bookmarked.</li>
              </ul>
            </div>
          </GlowCard>

          {/* Themes */}
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
              <p>Click the floating <strong>bot icon</strong> (bottom-right) to open the AI assistant. It can help you draft questions, design rounds, analyze quizzes, and explain concepts.</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Memory:</strong> the last 30 messages persist locally so the assistant remembers your conversation.</li>
                <li><strong>Resize/Expand:</strong> use the maximize button for a full-screen workspace.</li>
                <li><strong>Clear history:</strong> the trash icon resets memory.</li>
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
              </ul>
            </div>
          </GlowCard>
        </div>
      </main>
    </HoneycombLayout>
  );
}
