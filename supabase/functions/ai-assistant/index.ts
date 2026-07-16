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
      description: "Create a new quiz with questions in a folder. Optionally configure rounds for tournament mode, and/or set is_evaluation=true for a live evaluation/assessment quiz. Tournament + evaluation can be combined for a graded tournament with per-learner breakdowns.",
      parameters: {
        type: "object",
        properties: {
          folder_id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          is_evaluation: { type: "boolean", description: "If true, this is an evaluation/assessment quiz. Can be combined with rounds for a tournament-style evaluation. Learners see a per-question breakdown at the end." },
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
                language: { type: "string", enum: ["javascript", "python", "html"], description: "For code questions" },
                test_mode: { type: "string", enum: ["io", "assert"] },
                test_cases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      stdin: { type: "string" },
                      expected: { type: "string" },
                      code: { type: "string" },
                      is_hidden: { type: "boolean" },
                    },
                  },
                },
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
      name: "create_evaluation",
      description: "Create a live EVALUATION/ASSESSMENT quiz in a folder. Same live gameplay as a normal quiz, but focused on measuring performance — every learner gets a per-question breakdown at the end. Optionally pass 'rounds' to make it a tournament-style evaluation (rounds + cutoffs + per-learner breakdown). Use when the setter asks for a test, assessment, evaluation, performance check, graded tournament, or grading quiz. ALWAYS confirm folder, title, and question list with the setter BEFORE calling.",
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
                time_limit: { type: "number", description: "Per-question time in seconds (default 45 for evaluations)" },
                options: { type: "array", items: { type: "string" } },
                correct_option: { type: "number" },
                starter_code: { type: "string" },
                solution: { type: "string" },
                language: { type: "string", enum: ["javascript", "python", "html"] },
                test_mode: { type: "string", enum: ["io", "assert"] },
                test_cases: { type: "array", items: { type: "object" } },
                round_number: { type: "number", description: "Round this question belongs to (default 1). Only meaningful when rounds are provided." },
              },
              required: ["type", "content"],
            },
          },
          rounds: {
            type: "array",
            description: "Optional. If provided, the evaluation becomes a tournament-style evaluation. Each round defines a timer and cutoff.",
            items: {
              type: "object",
              properties: {
                round_number: { type: "number" },
                name: { type: "string" },
                duration_seconds: { type: "number", description: "Total round time (default 300)" },
                cutoff_type: { type: "string", enum: ["top_n", "top_pct"] },
                cutoff_value: { type: "number" },
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
      name: "publish_flashcard_set",
      description: "Publish (is_public=true) or unpublish (is_public=false) an existing flashcard set the setter owns. Publishing lets learners discover and bookmark it.",
      parameters: {
        type: "object",
        properties: {
          set_id: { type: "string" },
          publish: { type: "boolean", description: "true to publish, false to unpublish" },
        },
        required: ["set_id", "publish"],
      },
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
  {
    type: "function",
    function: {
      name: "list_lesson_courses",
      description: "List lesson courses owned by the current setter.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_lesson_outline_preview",
      description: "Draft a course outline (course title + list of lesson titles+objectives) from a topic WITHOUT saving. Use to show the setter for approval before calling create_lesson_course.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          language: { type: "string", enum: ["javascript", "python", "html"] },
          lesson_count: { type: "number" },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lesson_course",
      description: "Create a full lesson course with interactive coding lessons. Each lesson has a concept, an objective, starter_code in Monaco editor, and test_cases that verify the learner's solution. ALWAYS confirm the outline (title, subject, list of lessons with objectives) with the setter BEFORE calling. Default is_public=false.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          subject: { type: "string" },
          is_public: { type: "boolean" },
          cover_image_url: { type: "string" },
          lessons: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                concept_markdown: { type: "string", description: "Concept explanation (markdown)" },
                objective: { type: "string", description: "Single-sentence goal" },
                hint: { type: "string" },
                image_url: { type: "string" },
                language: { type: "string", enum: ["javascript", "python", "html"] },
                starter_code: { type: "string" },
                solution: { type: "string" },
                test_mode: { type: "string", enum: ["io", "assert"] },
                test_cases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      stdin: { type: "string" },
                      expected: { type: "string" },
                      code: { type: "string" },
                      is_hidden: { type: "boolean" },
                    },
                  },
                },
              },
              required: ["title", "objective", "language", "starter_code"],
            },
          },
        },
        required: ["title", "lessons"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_lessons_to_course",
      description: "Append lessons to an existing course the setter owns. Confirm first.",
      parameters: {
        type: "object",
        properties: {
          course_id: { type: "string" },
          lessons: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                concept_markdown: { type: "string" },
                objective: { type: "string" },
                hint: { type: "string" },
                language: { type: "string", enum: ["javascript", "python", "html"] },
                starter_code: { type: "string" },
                solution: { type: "string" },
                test_mode: { type: "string", enum: ["io", "assert"] },
                test_cases: { type: "array", items: { type: "object" } },
              },
              required: ["title", "objective", "language", "starter_code"],
            },
          },
        },
        required: ["course_id", "lessons"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_questions_to_quiz",
      description: "Append questions (mcq or code) to an existing quiz the setter owns. Use to grow a quiz that was already created. Order_index is auto-computed after the current last question.",
      parameters: {
        type: "object",
        properties: {
          quiz_id: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["mcq", "code"] },
                content: { type: "string" },
                points: { type: "number" },
                time_limit: { type: "number" },
                round_number: { type: "number" },
                options: { type: "array", items: { type: "string" } },
                correct_option: { type: "number" },
                starter_code: { type: "string" },
                solution: { type: "string" },
                language: { type: "string", enum: ["javascript", "python", "html"] },
                test_mode: { type: "string", enum: ["io", "assert"] },
                test_cases: { type: "array", items: { type: "object" } },
              },
              required: ["type", "content"],
            },
          },
        },
        required: ["quiz_id", "questions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_question",
      description: "Update fields on an existing question. Only the provided fields are changed. Setter must own the parent quiz's folder.",
      parameters: {
        type: "object",
        properties: {
          question_id: { type: "string" },
          content: { type: "string" },
          points: { type: "number" },
          time_limit: { type: "number" },
          round_number: { type: "number" },
          options: { type: "array", items: { type: "string" } },
          correct_option: { type: "number" },
          starter_code: { type: "string" },
          solution: { type: "string" },
          language: { type: "string", enum: ["javascript", "python", "html"] },
          test_mode: { type: "string", enum: ["io", "assert"] },
          test_cases: { type: "array", items: { type: "object" } },
        },
        required: ["question_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_question",
      description: "Delete a single question from a quiz the setter owns.",
      parameters: {
        type: "object",
        properties: { question_id: { type: "string" } },
        required: ["question_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_quiz",
      description: "Update quiz-level fields (title, description, is_evaluation). Only provided fields change.",
      parameters: {
        type: "object",
        properties: {
          quiz_id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          is_evaluation: { type: "boolean" },
        },
        required: ["quiz_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_quiz_rounds",
      description: "Replace the rounds config for a quiz (deletes existing rounds and inserts the provided list). Pass an empty rounds array to remove tournament mode.",
      parameters: {
        type: "object",
        properties: {
          quiz_id: { type: "string" },
          rounds: {
            type: "array",
            items: {
              type: "object",
              properties: {
                round_number: { type: "number" },
                name: { type: "string" },
                duration_seconds: { type: "number" },
                cutoff_type: { type: "string", enum: ["top_n", "top_pct"] },
                cutoff_value: { type: "number" },
              },
              required: ["round_number"],
            },
          },
        },
        required: ["quiz_id", "rounds"],
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
      const rawQs = Array.isArray(args.questions) ? args.questions.filter((q: any) => q && typeof q.content === "string" && q.content.trim().length > 0) : [];
      if (rawQs.length === 0) return { error: "Refused: quiz must include at least one question with non-empty content. Ask the setter for the questions before calling create_quiz." };
      if (!args.folder_id || !args.title) return { error: "Refused: folder_id and title are required." };
      const totalPoints = rawQs.reduce((a: number, q: any) => a + (q.points || 10), 0);
      const isEval = !!args.is_evaluation;
      const { data: quiz, error: qe } = await supabase.from("quizzes").insert({
        folder_id: args.folder_id,
        title: args.title,
        description: args.description || "",
        total_points: totalPoints,
        is_evaluation: isEval,
      }).select("id").single();
      if (qe) return { error: qe.message };

      const questions = rawQs.map((q: any, i: number) => ({
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
        language: q.type === "code" ? (q.language || "javascript") : null,
        test_mode: q.type === "code" ? (q.test_mode || "io") : null,
        test_cases: q.type === "code" ? (q.test_cases || []) : [],
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
          is_evaluation: isEval,
        },
      };
    }
    case "create_evaluation": {
      const rawQs = Array.isArray(args.questions) ? args.questions.filter((q: any) => q && typeof q.content === "string" && q.content.trim().length > 0) : [];
      if (rawQs.length === 0) return { error: "Refused: evaluation must include at least one question with non-empty content. Ask the setter for the questions (or generate them and confirm) BEFORE calling create_evaluation. Do NOT retry with an empty questions array." };
      if (!args.folder_id || !args.title) return { error: "Refused: folder_id and title are required." };
      const totalPoints = rawQs.reduce((a: number, q: any) => a + (q.points || 10), 0);
      const { data: quiz, error: qe } = await supabase.from("quizzes").insert({
        folder_id: args.folder_id,
        title: args.title,
        description: args.description || "",
        total_points: totalPoints,
        is_evaluation: true,
      }).select("id").single();
      if (qe) return { error: qe.message };
      const questions = rawQs.map((q: any, i: number) => ({
        quiz_id: quiz.id,
        type: q.type || "mcq",
        content: q.content,
        points: q.points || 10,
        time_limit: q.time_limit || 45,
        round_number: q.round_number || 1,
        options: q.type === "mcq" ? (q.options || ["", "", "", ""]) : [],
        correct_option: q.type === "mcq" ? (q.correct_option ?? 0) : 0,
        starter_code: q.type === "code" ? (q.starter_code || "") : "",
        solution: q.type === "code" ? (q.solution || "") : "",
        language: q.type === "code" ? (q.language || "javascript") : null,
        test_mode: q.type === "code" ? (q.test_mode || "io") : null,
        test_cases: q.type === "code" ? (q.test_cases || []) : [],
        order_index: i,
      }));
      if (questions.length > 0) {
        const { error: ie } = await supabase.from("questions").insert(questions);
        if (ie) return { error: ie.message };
      }
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
        created_evaluation: {
          id: quiz.id,
          title: args.title,
          question_count: questions.length,
          rounds: args.rounds?.length || 0,
        },
      };
    }
    case "publish_flashcard_set": {
      // Verify ownership
      const { data: owned } = await supabase.from("flashcard_sets").select("id").eq("id", args.set_id).eq("setter_id", userId).maybeSingle();
      if (!owned) return { error: "Set not found or you don't own it." };
      const { error } = await supabase.from("flashcard_sets").update({ is_public: !!args.publish }).eq("id", args.set_id);
      if (error) return { error: error.message };
      return { set_id: args.set_id, is_public: !!args.publish };
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
    case "list_lesson_courses": {
      const { data, error } = await supabase
        .from("lesson_courses")
        .select("id, title, description, subject, is_public, created_at")
        .eq("setter_id", userId)
        .order("created_at", { ascending: false });
      if (error) return { error: error.message };
      return { courses: data };
    }
    case "generate_lesson_outline_preview": {
      return {
        note: "Draft only — present the outline to the setter and get explicit consent before calling create_lesson_course.",
        topic: args.topic,
        language: args.language || "javascript",
        lesson_count: args.lesson_count || 6,
      };
    }
    case "create_lesson_course": {
      const lessons = Array.isArray(args.lessons) ? args.lessons : [];
      if (lessons.length === 0) return { error: "At least one lesson is required." };
      const { data: course, error: ce } = await supabase
        .from("lesson_courses")
        .insert({
          setter_id: userId,
          title: args.title,
          description: args.description || null,
          subject: args.subject || null,
          is_public: !!args.is_public,
          cover_image_url: args.cover_image_url || null,
        })
        .select("id, title")
        .single();
      if (ce) return { error: ce.message };
      const rows = lessons.map((l: any, i: number) => ({
        course_id: course.id,
        order_index: i,
        title: String(l.title || `Lesson ${i + 1}`),
        concept_markdown: l.concept_markdown || "",
        image_url: l.image_url || null,
        objective: l.objective || "",
        hint: l.hint || null,
        language: l.language || "javascript",
        starter_code: l.starter_code || "",
        solution: l.solution || "",
        test_mode: l.test_mode || "io",
        test_cases: l.test_cases || [],
      }));
      const { error: le } = await supabase.from("lessons").insert(rows);
      if (le) return { error: le.message };
      return { created_course: { id: course.id, title: course.title, lesson_count: rows.length } };
    }
    case "add_lessons_to_course": {
      const lessons = Array.isArray(args.lessons) ? args.lessons : [];
      if (lessons.length === 0) return { error: "No lessons provided." };
      const { data: owned } = await supabase
        .from("lesson_courses")
        .select("id")
        .eq("id", args.course_id)
        .eq("setter_id", userId)
        .maybeSingle();
      if (!owned) return { error: "Course not found or you don't own it." };
      const { data: existing } = await supabase
        .from("lessons")
        .select("order_index")
        .eq("course_id", args.course_id)
        .order("order_index", { ascending: false })
        .limit(1);
      const startIdx = (existing && existing[0]?.order_index != null) ? existing[0].order_index + 1 : 0;
      const rows = lessons.map((l: any, i: number) => ({
        course_id: args.course_id,
        order_index: startIdx + i,
        title: String(l.title || `Lesson ${startIdx + i + 1}`),
        concept_markdown: l.concept_markdown || "",
        image_url: l.image_url || null,
        objective: l.objective || "",
        hint: l.hint || null,
        language: l.language || "javascript",
        starter_code: l.starter_code || "",
        solution: l.solution || "",
        test_mode: l.test_mode || "io",
        test_cases: l.test_cases || [],
      }));
      const { error: le } = await supabase.from("lessons").insert(rows);
      if (le) return { error: le.message };
      return { added: rows.length, course_id: args.course_id };
    }
    case "add_questions_to_quiz": {
      const qs = Array.isArray(args.questions) ? args.questions : [];
      if (qs.length === 0) return { error: "No questions provided." };
      const { data: quiz } = await supabase
        .from("quizzes")
        .select("id, folder_id, total_points, folders!inner(user_id)")
        .eq("id", args.quiz_id)
        .maybeSingle();
      if (!quiz || (quiz as any).folders?.user_id !== userId) return { error: "Quiz not found or you don't own it." };
      const { data: existing } = await supabase
        .from("questions")
        .select("order_index")
        .eq("quiz_id", args.quiz_id)
        .order("order_index", { ascending: false })
        .limit(1);
      const startIdx = (existing && existing[0]?.order_index != null) ? existing[0].order_index + 1 : 0;
      const rows = qs.map((q: any, i: number) => ({
        quiz_id: args.quiz_id,
        type: q.type || "mcq",
        content: q.content,
        points: q.points || 10,
        time_limit: q.time_limit || 30,
        round_number: q.round_number || 1,
        options: q.type === "mcq" ? (q.options || ["", "", "", ""]) : [],
        correct_option: q.type === "mcq" ? (q.correct_option ?? 0) : 0,
        starter_code: q.type === "code" ? (q.starter_code || "") : "",
        solution: q.type === "code" ? (q.solution || "") : "",
        language: q.type === "code" ? (q.language || "javascript") : null,
        test_mode: q.type === "code" ? (q.test_mode || "io") : null,
        test_cases: q.type === "code" ? (q.test_cases || []) : [],
        order_index: startIdx + i,
      }));
      const { error: ie } = await supabase.from("questions").insert(rows);
      if (ie) return { error: ie.message };
      const added = rows.reduce((a, r) => a + (r.points || 0), 0);
      await supabase.from("quizzes").update({ total_points: (quiz as any).total_points + added }).eq("id", args.quiz_id);
      return { added: rows.length, quiz_id: args.quiz_id };
    }
    case "update_question": {
      const { data: q } = await supabase
        .from("questions")
        .select("id, quiz_id, quizzes!inner(folder_id, folders!inner(user_id))")
        .eq("id", args.question_id)
        .maybeSingle();
      if (!q || (q as any).quizzes?.folders?.user_id !== userId) return { error: "Question not found or you don't own it." };
      const upd: any = {};
      for (const k of ["content", "points", "time_limit", "round_number", "options", "correct_option", "starter_code", "solution", "language", "test_mode", "test_cases"]) {
        if (args[k] !== undefined) upd[k] = args[k];
      }
      if (Object.keys(upd).length === 0) return { error: "No fields to update." };
      const { error } = await supabase.from("questions").update(upd).eq("id", args.question_id);
      if (error) return { error: error.message };
      return { updated: args.question_id, fields: Object.keys(upd) };
    }
    case "delete_question": {
      const { data: q } = await supabase
        .from("questions")
        .select("id, quiz_id, points, quizzes!inner(total_points, folder_id, folders!inner(user_id))")
        .eq("id", args.question_id)
        .maybeSingle();
      if (!q || (q as any).quizzes?.folders?.user_id !== userId) return { error: "Question not found or you don't own it." };
      const { error } = await supabase.from("questions").delete().eq("id", args.question_id);
      if (error) return { error: error.message };
      const newTotal = ((q as any).quizzes.total_points || 0) - ((q as any).points || 0);
      await supabase.from("quizzes").update({ total_points: Math.max(0, newTotal) }).eq("id", (q as any).quiz_id);
      return { deleted: args.question_id };
    }
    case "update_quiz": {
      const { data: quiz } = await supabase
        .from("quizzes")
        .select("id, folders!inner(user_id)")
        .eq("id", args.quiz_id)
        .maybeSingle();
      if (!quiz || (quiz as any).folders?.user_id !== userId) return { error: "Quiz not found or you don't own it." };
      const upd: any = {};
      for (const k of ["title", "description", "is_evaluation"]) {
        if (args[k] !== undefined) upd[k] = args[k];
      }
      if (Object.keys(upd).length === 0) return { error: "No fields to update." };
      const { error } = await supabase.from("quizzes").update(upd).eq("id", args.quiz_id);
      if (error) return { error: error.message };
      return { updated: args.quiz_id, fields: Object.keys(upd) };
    }
    case "set_quiz_rounds": {
      const { data: quiz } = await supabase
        .from("quizzes")
        .select("id, folders!inner(user_id)")
        .eq("id", args.quiz_id)
        .maybeSingle();
      if (!quiz || (quiz as any).folders?.user_id !== userId) return { error: "Quiz not found or you don't own it." };
      const { error: de } = await supabase.from("quiz_rounds").delete().eq("quiz_id", args.quiz_id);
      if (de) return { error: de.message };
      const rounds = Array.isArray(args.rounds) ? args.rounds : [];
      if (rounds.length > 0) {
        const rows = rounds.map((r: any) => ({
          quiz_id: args.quiz_id,
          round_number: r.round_number,
          name: r.name || `Round ${r.round_number}`,
          duration_seconds: r.duration_seconds || 300,
          cutoff_type: r.cutoff_type || "top_n",
          cutoff_value: r.cutoff_value || 10,
        }));
        const { error: ie } = await supabase.from("quiz_rounds").insert(rows);
        if (ie) return { error: ie.message };
      }
      return { quiz_id: args.quiz_id, rounds: rounds.length };
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

CodeRace supports three game modes:
1. **Standard Mode** — all players answer all questions, ranked by score
2. **Tournament Mode** — questions grouped into rounds; after each round, only top N or top % players advance. Host gates progression between rounds.
3. **Evaluation / Assessment Mode** — runs live like a standard quiz, but focused on measuring performance. Every learner sees a per-question breakdown at the end (correct / wrong / skipped + points). Use this for tests, graded assessments, and performance checks. Evaluation can be combined with tournament rounds for a graded tournament that still produces a per-learner breakdown.

When analyzing tournament quizzes, also evaluate:
- Round difficulty progression (easier early rounds, harder finals)
- Cutoff fairness given the participant pool
- Round timer vs question count balance
- Whether final round has fewer/harder questions for tension

When creating quizzes, ask which folder. For tournaments, suggest reasonable round structures (e.g., 3 rounds: Top 50% → Top 25% → Top 1). For evaluations, use the dedicated create_evaluation tool (or create_quiz with is_evaluation=true) — recommend slightly longer per-question timers (45–60s) since accuracy matters more than speed. For a "tournament evaluation" or "graded tournament", pass both is_evaluation=true AND rounds (with round_number on each question) so learners still get per-question breakdowns after being ranked and eliminated across rounds.

To edit an EXISTING quiz: use get_quiz_questions to inspect, then add_questions_to_quiz to append, update_question to modify one, delete_question to remove one, update_quiz for title/description/is_evaluation, and set_quiz_rounds to replace rounds config. Always confirm destructive changes (delete/replace) with the setter first.

You can also create and manage **flashcard sets** for learners:
- Use generate_flashcards_preview (or draft them inline in markdown) to propose front/back pairs from a topic or source text.
- ALWAYS show the full draft (title, description, public/private, every front/back) and ask the setter to confirm before saving.
- Only call create_flashcard_set or add_flashcards_to_set after the setter has explicitly said yes / "create it" / "save them" in the latest message. Never save flashcards without that consent.
- Default is_public to false unless the setter asks for a public set. New sets start as drafts.
- Use publish_flashcard_set with publish=true to publish a draft set, or publish=false to unpublish.

You can also create **lesson courses** (interactive coding lessons with test cases):
- Use generate_lesson_outline_preview to draft an outline. Present the outline (course title, subject, list of lessons with title+objective+language) and ask the setter to confirm.
- Only call create_lesson_course or add_lessons_to_course after explicit "yes / save it / create it".
- Each lesson needs: title, concept_markdown, objective, language (javascript|python|html), starter_code, test_cases. Prefer test_mode="io" for stdin/stdout comparisons; use "assert" when a check like \`if (add(2,3) !== 5) throw new Error()\` fits better.
- For HTML lessons, test_cases can be CSS selectors that must exist (in "io" mode, put the selector in \`expected\`).
- Default is_public=false.

For code QUESTIONS inside quizzes/evaluations, use the same code-editor fields: language, test_mode, test_cases. Learners write code in a Monaco editor and their score is (passed/total)*points.

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
