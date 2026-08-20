import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Dimension { key: string; label: string; weight: number; keywords?: string[] }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brief, dimensions, submission, learnerName, passingScore } = await req.json() as {
      brief?: string;
      dimensions?: Dimension[];
      submission?: string;
      learnerName?: string;
      passingScore?: number;
    };

    if (!submission?.trim()) return json({ error: "No submission provided." }, 400);
    const dims = Array.isArray(dimensions) ? dimensions : [];
    if (dims.length === 0) return json({ error: "This rubric has no criteria." }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured." }, 500);

    const rubricText = dims
      .map((d) => `- key: "${d.key}" | criterion: ${d.label} | weight: ${d.weight}%${d.keywords?.length ? ` | what to look for: ${d.keywords.join(", ")}` : ""}`)
      .join("\n");

    const prompt = `You are an expert ICT educator grading a learner submission.

PROJECT BRIEF / RUBRIC TEXT (the setter's own words — this is the authority for grading):
"""
${brief?.trim() || "(no brief provided — judge on general software quality, creativity and problem solving)"}
"""

CRITERIA (score each 0-100):
${rubricText}

Passing score: ${passingScore ?? 60}/100.

LEARNER: ${learnerName || "Unnamed"}
SUBMISSION:
"""
${submission.slice(0, 20000)}
"""

Grade the submission strictly against the brief. Be fair but discriminating — do not give everyone high scores.
Respond with ONLY a JSON object, no markdown fences, in exactly this shape:
{"scores": {${dims.map((d) => `"${d.key}": <0-100>`).join(", ")}}, "feedback": "<2-4 sentences: what they did well, what is missing, referencing the brief>"}
Keep feedback under 120 words.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        input: prompt,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
      }),
    });

    if (res.status === 429) return json({ error: "Rate limit reached. Try again shortly." }, 429);
    if (res.status === 402) return json({ error: "AI credits exhausted. Please add credits." }, 402);
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      return json({ error: `AI error: ${text.slice(0, 300)}` }, 500);
    }

    // Consume the SSE stream and accumulate the answer text.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") out += evt.delta;
          else if (evt.type === "response.completed" && !out && evt.response?.output_text) out += evt.response.output_text;
        } catch { /* ignore partial */ }
      }
    }

    const cleaned = out.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: { scores?: Record<string, number>; feedback?: string } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* noop */ } }
    }

    if (!parsed.scores) {
      return json({ error: "The AI did not return a usable evaluation. Try again." }, 502);
    }

    const scores: Record<string, number> = {};
    let total = 0;
    const totalWeight = dims.reduce((a, d) => a + (Number(d.weight) || 0), 0) || 100;
    for (const d of dims) {
      const raw = Number(parsed.scores[d.key]);
      const s = Math.max(0, Math.min(100, Number.isFinite(raw) ? Math.round(raw) : 0));
      scores[d.key] = s;
      total += s * ((Number(d.weight) || 0) / totalWeight);
    }

    return json({
      scores,
      total: Math.round(total),
      feedback: (parsed.feedback || "").toString().trim(),
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
