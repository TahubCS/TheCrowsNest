"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import MaterialSelectionModal from "@/components/MaterialSelectionModal";
import QuotaIndicator from "@/components/QuotaIndicator";
import UpgradePrompt from "@/components/UpgradePrompt";
import { usePlan } from "@/hooks/usePlan";
import { NumberInput } from "@/components/ui/NumberInput";

interface MaterialOption {
  materialId: string;
  fileName: string;
  materialType?: string;
  status?: string;
}

interface Flashcard {
  front: string;
  back: string;
}

interface DeckRecord {
  id: string;
  source: "shared" | "personal";
  cards: Flashcard[];
  createdAt?: string;
  label?: string;
}

interface PersonalResourceRow {
  id?: string;
  resource_type?: string;
  content_json?: unknown;
  contentJson?: unknown;
  created_at?: string;
}

function normalizeCards(input: unknown): Flashcard[] {
  const source = Array.isArray((input as { flashcards?: unknown[] })?.flashcards)
    ? (input as { flashcards: unknown[] }).flashcards
    : Array.isArray(input)
      ? input
      : [];

  return source.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const row = entry as { front?: unknown; back?: unknown };
    const front = typeof row.front === "string" ? row.front.trim() : "";
    const back = typeof row.back === "string" ? row.back.trim() : "";

    if (!front || !back) {
      return [];
    }

    return [{ front, back }];
  });
}

function formatDeckLabel(deck: DeckRecord) {
  const when = deck.createdAt ? new Date(deck.createdAt).toLocaleString() : "Recently";
  const mode = deck.source === "shared" ? "Shared" : "Personal";
  return `${mode} deck, ${deck.cards.length} cards, ${when}`;
}

export default function FlashcardsPage() {
  const params = useParams();
  const classId = params.classId as string;
  const formattedClass = classId?.toUpperCase() || "CLASS";

  const { plan, loading: planLoading } = usePlan();
  const [isGenerating, setIsGenerating] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number; total: number } | null>(null);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [deckSize, setDeckSize] = useState(20);

  const [loadingDecks, setLoadingDecks] = useState(true);
  const [sharedDeck, setSharedDeck] = useState<DeckRecord | null>(null);
  const [personalDecks, setPersonalDecks] = useState<DeckRecord[]>([]);
  const [activeDeck, setActiveDeck] = useState<DeckRecord | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const loadInitialQuota = useCallback(async () => {
    if (plan !== "premium") {
      return;
    }

    try {
      const res = await fetch("/api/user/plan");
      const data = await res.json();
      if (data.success && data.data?.quotas?.flashcards) {
        setQuota({
          remaining: data.data.quotas.flashcards.remaining,
          total: data.data.quotas.flashcards.total,
        });
      }
    } catch (error) {
      console.error("[Flashcards] Failed to load quota:", error);
    }
  }, [plan]);

  const loadDecks = useCallback(async () => {
    setLoadingDecks(true);
    try {
      const [sharedRes, personalRes] = await Promise.all([
        fetch(`/api/classes/${classId}/shared-resources`),
        fetch(`/api/classes/${classId}/personal-resources`),
      ]);

      const sharedJson = await sharedRes.json();
      if (sharedJson.success) {
        const cards = normalizeCards(sharedJson.data?.flashcards);
        setSharedDeck(cards.length > 0 ? {
          id: `shared-${classId}`,
          source: "shared",
          cards,
          createdAt: sharedJson.data?.updatedAt,
          label: "Community Flashcard Deck",
        } : null);
      }

      const personalJson = await personalRes.json();
      if (personalJson.success && Array.isArray(personalJson.data)) {
        const decks = (personalJson.data as PersonalResourceRow[])
          .filter((row) => row.resource_type === "flashcards")
          .flatMap((row) => {
            const cards = normalizeCards(row.content_json ?? row.contentJson);
            if (cards.length === 0) {
              return [];
            }
            return [{
              id: row.id ?? `personal-${row.created_at ?? Date.now()}`,
              source: "personal" as const,
              cards,
              createdAt: row.created_at,
              label: "Saved Personal Deck",
            }];
          });

        setPersonalDecks(decks);
      }
    } catch (error) {
      console.error("[Flashcards] Failed to load decks:", error);
    } finally {
      setLoadingDecks(false);
    }
  }, [classId]);

  useEffect(() => {
    loadInitialQuota();
  }, [loadInitialQuota]);

  useEffect(() => {
    if (classId) {
      void loadDecks();
    }
  }, [classId, loadDecks]);

  useEffect(() => {
    async function loadMaterials() {
      try {
        const res = await fetch(`/api/materials?classId=${classId}`);
        const data = await res.json();
        if (data.success) {
          const approved = (data.data?.materials || []).filter((material: MaterialOption) => material.status === "PROCESSED");
          setMaterials(approved);
        }
      } catch (error) {
        console.error("[Flashcards] Failed to load materials:", error);
      }
    }

    if (classId && plan === "premium") {
      void loadMaterials();
    }
  }, [classId, plan]);

  const launchDeck = (deck: DeckRecord) => {
    if (deck.cards.length === 0) {
      toast.error("This deck has no cards.");
      return;
    }

    setActiveDeck(deck);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleToggleMaterial = (materialId: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(materialId) ? prev.filter((id) => id !== materialId) : [...prev, materialId]
    );
  };

  const handleGeneratePersonal = async () => {
    if (selectedMaterialIds.length === 0) {
      toast.error("Select at least one material.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch(`/api/classes/${classId}/personal-resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: "flashcards",
          materialIds: selectedMaterialIds,
          questionCount: Math.min(30, Math.max(5, Math.trunc(deckSize))),
        }),
      });

      const data = await res.json();
      if (res.status === 403) {
        toast.error("Upgrade to Premium to generate personal flashcards.");
        return;
      }
      if (res.status === 429) {
        toast.error(data.message || "Daily flashcard limit reached. Try again tomorrow!");
        return;
      }
      if (!data.success) {
        toast.error(data.message || "Failed to generate personal flashcards.");
        return;
      }

      const cards = normalizeCards(data.data?.content_json ?? data.data?.contentJson ?? data.data);
      if (cards.length === 0) {
        toast.error("Generation completed but no flashcards were returned.");
        return;
      }

      const generatedDeck: DeckRecord = {
        id: data.data?.id ?? `personal-${Date.now()}`,
        source: "personal",
        cards,
        createdAt: data.data?.created_at,
        label: "Saved Personal Deck",
      };

      setPersonalDecks((prev) => [generatedDeck, ...prev.filter((deck) => deck.id !== generatedDeck.id)]);
      launchDeck(generatedDeck);

      setSelectedMaterialIds([]);
      setShowMaterialModal(false);
      toast.success("Personal flashcard deck generated.");

      await loadInitialQuota();
      await loadDecks();
    } catch (error) {
      console.error(error);
      toast.error("Network error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeCards = activeDeck?.cards ?? [];
  const currentCard = activeCards[currentIndex];

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <Link href={`/dashboard/classes/${classId}`} className="text-sm font-medium text-muted-foreground hover:text-green-500 inline-flex items-center gap-1 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to {formattedClass} Overview
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-green-400 to-emerald-600">
              Flashcard Studio
            </h1>
            <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
              Launch shared flashcards or build personal decks from selected materials.
            </p>
          </div>
        </div>
      </div>

      {activeDeck ? (
        <div className="rounded-3xl border border-border bg-background p-6 shadow-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {activeDeck.source === "shared" ? "Shared deck" : "Personal deck"}
              </p>
              <h2 className="text-2xl font-bold mt-1">
                {activeDeck.label ?? "Flashcard Deck"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDeckLabel(activeDeck)}
              </p>
            </div>
            <button
              onClick={() => {
                setActiveDeck(null);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted/50"
            >
              Back to decks
            </button>
          </div>

          {currentCard && (
            <div className="flex flex-col items-center">
              <div className="flex justify-between w-full mb-6 items-center">
                <span className="text-sm font-bold text-muted-foreground">CARD {currentIndex + 1} OF {activeCards.length}</span>
                <button
                  onClick={() => {
                    setActiveDeck(null);
                    setCurrentIndex(0);
                    setIsFlipped(false);
                  }}
                  className="text-sm text-muted-foreground hover:text-red-500 font-semibold transition-colors"
                >
                  Exit Deck
                </button>
              </div>

              <div className="w-full aspect-4/3 md:aspect-video cursor-pointer group" style={{ perspective: "1000px" }} onClick={() => setIsFlipped((prev) => !prev)}>
                <div
                  className="relative w-full h-full transition-transform duration-500"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  <div className="absolute inset-0 bg-background border border-border rounded-3xl shadow-xl flex items-center justify-center p-8 md:p-12 text-center overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
                    <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-green-400 to-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Question</p>
                      <h3 className="text-2xl md:text-4xl font-bold leading-tight text-foreground">{currentCard.front}</h3>
                    </div>
                    <div className="absolute bottom-6 right-8 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">Click to flip</div>
                  </div>

                  <div className="absolute inset-0 bg-green-500/5 border border-green-500/20 rounded-3xl shadow-xl flex items-center justify-center p-8 md:p-12 text-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                    <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-teal-400 to-green-500" />
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Answer</p>
                      <p className="text-xl md:text-3xl font-medium leading-relaxed text-foreground">{currentCard.back}</p>
                    </div>
                    <div className="absolute bottom-6 left-8 text-green-500/50 opacity-0 group-hover:opacity-100 transition-opacity">Click to unflip</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8 w-full">
                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setTimeout(() => setCurrentIndex((prev) => (prev - 1 + activeCards.length) % activeCards.length), 150);
                  }}
                  className="flex-1 py-4 bg-background border border-border rounded-xl font-bold hover:bg-muted/50 transition-colors shadow-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % activeCards.length), 150);
                  }}
                  className="flex-1 py-4 bg-linear-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-green-500/20 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="h-fit rounded-3xl border border-border bg-background p-6 shadow-xl self-start">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Shared deck</p>
                  <h2 className="text-2xl font-bold mt-1">Community Flashcards</h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">FREE</span>
              </div>

              {loadingDecks ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500" />
                  Loading flashcard decks...
                </div>
              ) : sharedDeck ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Launch the latest shared deck built from approved class materials.
                  </p>
                  <button
                    onClick={() => launchDeck(sharedDeck)}
                    className="w-full rounded-xl bg-green-600 px-4 py-3 text-white font-bold hover:bg-green-700 transition-colors"
                  >
                    Launch Shared Deck
                  </button>
                  <p className="mt-3 text-xs text-muted-foreground">{sharedDeck.cards.length} cards available.</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Shared flashcards are not ready yet. They are generated automatically after approved materials are processed.
                </p>
              )}
            </div>

            <div className="h-fit rounded-3xl border border-border bg-background p-6 shadow-xl self-start">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Personal decks</p>
                  <h2 className="text-2xl font-bold mt-1">Saved Premium Decks</h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">PREMIUM</span>
              </div>

              {plan === "premium" ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a personal deck from selected materials and reopen it anytime.
                  </p>
                  <NumberInput
                    label="Deck size"
                    min={5}
                    max={30}
                    value={deckSize}
                    onChangeValue={(val) => setDeckSize(val)}
                    className="mb-4"
                  />
                  <button
                    onClick={() => setShowMaterialModal(true)}
                    disabled={isGenerating}
                    className="w-full rounded-xl bg-linear-to-r from-green-500 to-emerald-600 px-4 py-3 text-white font-bold hover:opacity-95 disabled:opacity-70"
                  >
                    {isGenerating ? "Generating Personal Deck..." : "Select Materials & Generate"}
                  </button>

                  <div className="mt-5 space-y-3 max-h-[350px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-border">
                    {personalDecks.length > 0 ? personalDecks.map((deck) => (
                      <div key={deck.id} className="relative group">
                        <button
                          onClick={() => launchDeck(deck)}
                          className="w-full rounded-2xl border border-border bg-muted/20 px-4 py-3 text-left hover:border-green-500 hover:bg-green-500/5 transition-colors pr-14"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">Saved deck</p>
                              <p className="text-xs text-muted-foreground mt-1">{formatDeckLabel(deck)}</p>
                            </div>
                            <span className="text-xs font-bold text-green-700">Open</span>
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toast("Delete this personal deck?", {
                              description: "This action cannot be undone.",
                              action: {
                                label: "Delete",
                                onClick: async () => {
                                  try {
                                    const res = await fetch(`/api/classes/${classId}/personal-resources?id=${deck.id}`, { method: "DELETE" });
                                    if (res.ok) {
                                      setPersonalDecks(prev => prev.filter(d => d.id !== deck.id));
                                      toast.success("Deck deleted.");
                                    } else {
                                      toast.error("Failed to delete deck.");
                                    }
                                  } catch {
                                    toast.error("Network error.");
                                  }
                                }
                              },
                              cancel: { label: "Cancel", onClick: () => { } }
                            });
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete deck"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">No saved personal decks yet.</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Premium unlocks personal flashcard generation from selected materials.
                  </p>
                  <div className="mt-4">
                    <UpgradePrompt featureName="generate personal flashcard decks from selected materials" />
                  </div>
                </>
              )}
            </div>
          </div>

          {quota && <QuotaIndicator remaining={quota.remaining} total={quota.total} resourceName="flashcard generations" />}

          {planLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
            </div>
          ) : null}
        </>
      )}

      <MaterialSelectionModal
        open={showMaterialModal}
        title="Generate Personal Flashcards"
        subtitle="Select approved materials to include in your personal deck."
        materials={materials}
        selectedIds={selectedMaterialIds}
        submitting={isGenerating}
        onToggle={handleToggleMaterial}
        onClose={() => {
          if (!isGenerating) {
            setShowMaterialModal(false);
          }
        }}
        onSubmit={handleGeneratePersonal}
      />
    </div>
  );
}
