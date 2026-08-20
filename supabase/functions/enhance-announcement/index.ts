import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, body } = await req.json();
    if (!title?.trim() && !body?.trim()) {
      return new Response(JSON.stringify({ error: "Provide a title or body first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You polish product announcements for CodeRace, a competitive ICT quiz platform.
Rewrite the given draft so it is:
- Clear, energetic, and friendly (learners and educators are the audience)
- Well-structured: short punchy title (max ~70 chars), body under ~180 words
- Uses light markdown / short paragraphs / bullet points where helpful
- Keeps the original meaning; do not invent features that weren't mentioned
Respond ONLY with a valid JSON object of the form {"title": "...", "body": "..."} and no other text.`;

    const userMsg = `Draft title: ${title || "(none)"}\n\nDraft body:\n${body || "(none)"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `AI error: ${text.slice(0, 200)}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { title?: string; body?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { title, body: content };
    }

    return new Response(
      JSON.stringify({
        title: (parsed.title || title || "").toString().trim(),
        body: (parsed.body || body || "").toString().trim(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});