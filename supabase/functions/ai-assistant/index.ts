import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_folders",
      description: "List all folders for the current user",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_folder",
      description: "Create a new folder",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Folder name" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_quizzes",
      description: "List quizzes in a folder",
      parameters: {
        type: "object",
        properties: { folder_id: { type: "string" } },
        required: ["folder_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_quiz_questions",
      description: "Get all questions for a quiz to analyze them. Includes round_number for tournament quizzes.",
      parameters: {
        type: "object",
        properties: { quiz_id: { type: "string" } },
        required: ["quiz_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_quiz_rounds",
      description: "Get the round configuration (timer, cutoff) for a tournament-style quiz.",
      parameters: {
        type: "object",
        properties: { quiz_id: { type: "string" } },
        required: ["quiz_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_quiz",
      description: "Create a new quiz with questions in a folder. Optionally configure rounds for tournament mode.",
      parameters: {
        type: "object",
        properties: {
          folder_id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["mcq", "code"] },
                content: { type: "string" },
                points: { type: "number" },
                time_limit: { type: "number", description: "Per-question time in seconds (default 30)" },
                round_number: { type: "number", description: "Round this question belongs to (default 1)" },
                options: { type: "array", items: { type: "string" } },
                correct_option: { type: "number" },
                starter_code: { type: "string" },
                solution: { type: "string" },
              },
              required: ["type", "content"],
            },
          },
          rounds: {
            type: "array",
            description: "Optional. If provided, the quiz becomes a tournament. Each round defines a timer and cutoff.",
            items: {
              type: "object",
              properties: {
                round_number: { type: "number" },
                name: { type: "string" },
                duration_seconds: { type: "number", description: "Total round time (default 300)" },
                cutoff_type: { type: "string", enum: ["top_n", "top_pct"] },
                cutoff_value: { type: "number", description: "Number of players or percentage advancing" },
              },
              required: ["round_number"],
            },
          },
        },
        required: ["folder_id", "title", "questions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_flashcard_sets",
      description: "List flashcard sets owned by the current setter.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_flashcard_set",
      description: "Create a new flashcard set with cards. ALWAYS confirm with the setter (title, description, visibility, and the list of cards) BEFORE calling this. Do not call without explicit consent in the latest user message.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          subject: { type: "string", description: "Optional subject/topic tag" },
          is_public: { type: "boolean", description: "If true, learners can discover and bookmark this set. Default false." },
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" },
              },
              required: ["front", "back"],
            },
          },
        },
        required: ["title", "cards"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_flashcards_to_set",
      description: "Append additional cards to an existing flashcard set the setter owns. Confirm with the setter first.",
      parameters: {
        type: "object",
        properties: {
          set_id: { type: "string" },
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" },
              },
              required: ["front", "back"],
            },
          },
        },
        required: ["set_id", "cards"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_flashcards_preview",
      description: "Generate a draft list of flashcards from a topic or source text WITHOUT saving anything. Use this to show the setter what would be created so they can review and consent before calling create_flashcard_set.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic or source material to derive flashcards from" },
          count: { type: "number", description: "How many cards to draft (default 10)" },
        },
        required: ["topic"],
      },
    },
  },
];

async function executeTool(supabase: any, userId: string, name: string, args: any) {
  switch (name) {
    case "list_folders": {
      const { data, error } = await supabase.from("folders").select("id, name").eq("user_id", userId);
      if (error) return { error: error.message };
      return { folders: data };
    }
    case "create_folder": {
      const { data, error } = await supabase.from("folders").insert({ name: args.name, user_id: userId }).select("id, name").single();
      if (error) return { error: error.message };
      return { created: data };
    }
    case "list_quizzes": {
      const { data, error } = await supabase.from("quizzes").select("id, title, description, total_points").eq("folder_id", args.folder_id);
      if (error) return { error: error.message };
      return { quizzes: data };
    }
    case "get_quiz_questions": {
      const { data: quiz } = await supabase.from("quizzes").select("id, title, description").eq("id", args.quiz_id).single();
      const { data: questions, error } = await supabase.from("questions").select("*").eq("quiz_id", args.quiz_id).order("order_index");
      if (error) return { error: error.message };
      return { quiz, questions };
    }
    case "get_quiz_rounds": {
      const { data, error } = await supabase.from("quiz_rounds").select("*").eq("quiz_id", args.quiz_id).order("round_number");
      if (error) return { error: error.message };
      return { rounds: data, is_tournament: (data || []).length > 0 };
    }
    case "create_quiz": {
      const totalPoints = (args.questions || []).reduce((a: number, q: any) => a + (q.points || 10), 0);
      const { data: quiz, error: qe } = await supabase.from("quizzes").insert({
        folder_id: args.folder_id,
        title: args.title,
        description: args.description || "",
        total_points: totalPoints,
      }).select("id").single();
      if (qe) return { error: qe.message };

      const questions = (args.questions || []).map((q: any, i: number) => ({
        quiz_id: quiz.id,
        type: q.type || "mcq",
        content: q.content,
        points: q.points || 10,
        time_limit: q.time_limit || 30,
        round_number: q.round_number || 1,
        options: q.type === "mcq" ? (q.options || ["", "", "", ""]) : [],
        correct_option: q.type === "mcq" ? (q.correct_option ?? 0) : 0,
        starter_code: q.type === "code" ? (q.starter_code || "") : "",
        solution: q.type === "code" ? (q.solution || "") : "",
        order_index: i,
      }));
      if (questions.length > 0) {
        const { error: ie } = await supabase.from("questions").insert(questions);
        if (ie) return { error: ie.message };
      }

      // Create rounds if provided
      if (Array.isArray(args.rounds) && args.rounds.length > 0) {
        const rounds = args.rounds.map((r: any) => ({
          quiz_id: quiz.id,
          round_number: r.round_number,
          name: r.name || `Round ${r.round_number}`,
          duration_seconds: r.duration_seconds || 300,
          cutoff_type: r.cutoff_type || "top_n",
          cutoff_value: r.cutoff_value || 10,
        }));
        const { error: re } = await supabase.from("quiz_rounds").insert(rounds);
        if (re) return { error: re.message };
      }

      return {
        created_quiz: {
          id: quiz.id,
          title: args.title,
          question_count: questions.length,
          rounds: args.rounds?.length || 0,
        },
      };
    }
    case "list_flashcard_sets": {
      const { data, error } = await supabase
        .from("flashcard_sets")
        .select("id, title, description, subject, is_public, created_at")
        .eq("setter_id", userId)
        .order("created_at", { ascending: false });
      if (error) return { error: error.message };
      return { sets: data };
    }
    case "create_flashcard_set": {
      const cards = Array.isArray(args.cards) ? args.cards : [];
      if (cards.length === 0) return { error: "At least one card is required." };
      const { data: set, error: se } = await supabase
        .from("flashcard_sets")
        .insert({
          setter_id: userId,
          title: args.title,
          description: args.description || null,
          subject: args.subject || null,
          is_public: !!args.is_public,
        })
        .select("id, title")
        .single();
      if (se) return { error: se.message };
      const rows = cards.map((c: any, i: number) => ({
        set_id: set.id,
        front: String(c.front || "").trim(),
        back: String(c.back || "").trim(),
        order_index: i,
      })).filter((r: any) => r.front && r.back);
      const { error: ce } = await supabase.from("flashcards").insert(rows);
      if (ce) return { error: ce.message };
      return { created_set: { id: set.id, title: set.title, card_count: rows.length } };
    }
    case "add_flashcards_to_set": {
      const cards = Array.isArray(args.cards) ? args.cards : [];
      if (cards.length === 0) return { error: "No cards provided." };
      // Verify ownership
      const { data: owned } = await supabase
        .from("flashcard_sets")
        .select("id")
        .eq("id", args.set_id)
        .eq("setter_id", userId)
        .maybeSingle();
      if (!owned) return { error: "Set not found or you don't own it." };
      const { data: existing } = await supabase
        .from("flashcards")
        .select("order_index")
        .eq("set_id", args.set_id)
        .order("order_index", { ascending: false })
        .limit(1);
      const startIdx = (existing && existing[0]?.order_index != null) ? existing[0].order_index + 1 : 0;
      const rows = cards.map((c: any, i: number) => ({
        set_id: args.set_id,
        front: String(c.front || "").trim(),
        back: String(c.back || "").trim(),
        order_index: startIdx + i,
      })).filter((r: any) => r.front && r.back);
      const { error: ie } = await supabase.from("flashcards").insert(rows);
      if (ie) return { error: ie.message };
      return { added: rows.length, set_id: args.set_id };
    }
    case "generate_flashcards_preview": {
      // Pure draft — no DB writes. Returned to the model so it can show the setter for review.
      return {
        note: "Draft only — present these to the setter and ask for explicit confirmation before calling create_flashcard_set.",
        topic: args.topic,
        suggested_count: args.count || 10,
      };
    }
    default:
      return { error: "Unknown tool" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables", {
        hasUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(Deno.env.get("SUPABASE_ANON_KEY")),
        hasPublishableKey: Boolean(Deno.env.get("SUPABASE_PUBLISHABLE_KEY")),
      });

      return new Response(JSON.stringify({ error: "Server configuration error: Missing Supabase credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are CodeRace AI Assistant — a smart helper for quiz setters on the CodeRace tournament platform.

You can:
- List folders and quizzes
- Analyze quiz questions for quality, difficulty balance, clarity, and coverage
- Inspect tournament rounds (timer, cutoff thresholds) via get_quiz_rounds
- Create new folders and quizzes — including TOURNAMENT-style quizzes with rounds
- Give insights on how to improve questions and round structure

CodeRace supports two game modes:
1. **Standard Mode** — all players answer all questions, ranked by score
2. **Tournament Mode** — questions grouped into rounds; after each round, only top N or top % players advance. Host gates progression between rounds.

When analyzing tournament quizzes, also evaluate:
- Round difficulty progression (easier early rounds, harder finals)
- Cutoff fairness given the participant pool
- Round timer vs question count balance
- Whether final round has fewer/harder questions for tension

When creating quizzes, ask which folder. For tournaments, suggest reasonable round structures (e.g., 3 rounds: Top 50% → Top 25% → Top 1).

You can also create **flashcard sets** for learners:
- Use generate_flashcards_preview (or draft them inline in markdown) to propose front/back pairs from a topic or source text.
- ALWAYS show the full draft (title, description, public/private, every front/back) and ask the setter to confirm before saving.
- Only call create_flashcard_set or add_flashcards_to_set after the setter has explicitly said yes / "create it" / "save them" in the latest message. Never save flashcards without that consent.
- Default is_public to false unless the setter asks for a public set.

Be concise, friendly, and use markdown. Use emoji sparingly.`;

    const apiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    for (let i = 0; i < 5; i++) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: apiMessages,
          tools: TOOLS,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${status}`);
      }

      const result = await response.json();
      const choice = result.choices[0];

      if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
        apiMessages.push(choice.message);
        for (const tc of choice.message.tool_calls) {
          const args = JSON.parse(tc.function.arguments);
          const toolResult = await executeTool(supabase, user.id, tc.function.name, args);
          apiMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(toolResult),
          });
        }
        continue;
      }

      return new Response(JSON.stringify({ reply: choice.message.content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reply: "I ran into a loop processing your request. Please try rephrasing." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
