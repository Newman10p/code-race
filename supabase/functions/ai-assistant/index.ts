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
      description: "Get all questions for a quiz to analyze them",
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
      description: "Create a new quiz with questions in a folder",
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
                time_limit: { type: "number" },
                options: { type: "array", items: { type: "string" } },
                correct_option: { type: "number" },
                starter_code: { type: "string" },
                solution: { type: "string" },
              },
              required: ["type", "content"],
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
      return { created_quiz: { id: quiz.id, title: args.title, question_count: questions.length } };
    }
    default:
      return { error: "Unknown tool" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
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

    const systemPrompt = `You are CodeRace AI Assistant — a smart helper for quiz setters on the CodeRace platform.

You can:
- List folders and quizzes
- Analyze quiz questions for quality, difficulty balance, clarity, and coverage
- Create new folders and quizzes with questions
- Give insights on how to improve questions

When analyzing questions, consider:
- Clarity and unambiguity of the question text
- Quality of distractors (wrong options) — they should be plausible
- Difficulty distribution across the quiz
- Time limits relative to question complexity
- Point allocation fairness
- Topic coverage

When creating quizzes, always ask for the folder to put it in (list folders first if needed).
Be concise, friendly, and use markdown formatting. Use emoji sparingly for personality.`;

    let apiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Loop for tool calling
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
