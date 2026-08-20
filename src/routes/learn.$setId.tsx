import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/learn/$setId")({
  component: StudySet,
});

interface Card {
  id: string;
  front: string;
  back: string;
}

function StudySet() {
  const { setId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: set } = await supabase
        .from("flashcard_sets")
        .select("title")
        .eq("id", setId)
        .maybeSingle();
      if (set) setTitle(set.title);
      const { data } = await supabase
        .from("flashcards")
        .select("id, front, back")
        .eq("set_id", setId)
        .order("order_index");
      setCards(data || []);
      setLoading(false);
    })();
  }, [user, setId]);

  const next = () => {
    setFlipped(false);
    setIdx((i) => (i + 1) % Math.max(cards.length, 1));
  };
  const prev = () => {
    setFlipped(false);
    setIdx((i) => (i - 1 + cards.length) % Math.max(cards.length, 1));
  };

  if (loading) {
    return (
      <HoneycombLayout>
        <Navbar />
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </HoneycombLayout>
    );
  }

  const card = cards[idx];

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/learn"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to library
        </Link>

        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {cards.length === 0 ? "No cards" : `Card ${idx + 1} of ${cards.length}`}
        </p>

        {card ? (
          <>
            <button
              onClick={() => setFlipped((f) => !f)}
              className="block w-full"
            >
              <GlowCard className="flex min-h-[320px] cursor-pointer items-center justify-center p-8 text-center">
                <div>
                  <p className="mb-3 text-xs uppercase tracking-widest text-primary">
                    {flipped ? "Answer" : "Question"}
                  </p>
                  <p className="text-xl font-medium leading-relaxed">
                    {flipped ? card.back : card.front}
                  </p>
                  <p className="mt-6 text-xs text-muted-foreground">
                    Click card to flip
                  </p>
                </div>
              </GlowCard>
            </button>
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button variant="neon-outline" onClick={prev} disabled={cards.length < 2}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)}>
                <RotateCw className="h-4 w-4" /> Flip
              </Button>
              <Button variant="neon" onClick={next} disabled={cards.length < 2}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <GlowCard className="py-12 text-center text-muted-foreground">
            This set has no cards yet.
          </GlowCard>
        )}
      </main>
    </HoneycombLayout>
  );
}
