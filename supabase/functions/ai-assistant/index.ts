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
