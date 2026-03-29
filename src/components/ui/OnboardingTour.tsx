"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOUR_KEY = "thecrowsnest_tour_complete";
const CARD_W = 280; // Lite width
const CARD_H = 180; 
const PAD = 16;

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourStep {
  targetId: string | null;
  title: string;
  body: string;
  cta?: string;                  
  placement?: "right" | "bottom" | "top" | "left" | "center";
  clickToContinue?: boolean;     
  autoNavigateOnNext?: string;   
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS: TourStep[] = [
  {
    targetId: null,
    title: "Welcome! 🏴‍☠️",
    body: "Let's take a quick 60-second tour to show you how to navigate your study hub.",
    cta: "Start Tour →",
    placement: "center",
  },
  {
    targetId: "tour-my-classes",
    title: "My Classes",
    body: "This is where all your enrolled classes live. You can always click here to return to your main schedule.",
    placement: "right",
  },
  {
    targetId: "tour-onboarding-class",
    title: "Example Class",
    body: "We've added 'Onboarding 101' just for you. Click it to see how class-specific features work!",
    placement: "right",
    clickToContinue: true,
  },
  {
    targetId: "tour-upload-btn",
    title: "Materials",
    body: "Upload your syllabus, slides, or notes. The more you share, the better the AI becomes for everyone!",
    placement: "bottom",
  },
  {
    targetId: "tour-material-row",
    title: "Class Feed",
    body: "View and report shared documents. Hover a row to see detailed options.",
    placement: "top",
  },
  {
    targetId: "tour-study-tools",
    title: "AI Tools",
    body: "Generate study plans, flashcards, or chat with a tutor about the class material.",
    placement: "bottom",
  },
  {
    targetId: "tour-requests",
    title: "Requests",
    body: "Searching for a class and can't find it? Request it here! Remember to search first.",
    placement: "right",
    clickToContinue: true,
  },
  {
    targetId: "tour-profile",
    title: "Profile",
    body: "Lastly, manage your major and preferences. Click 'Settings & Profile' to wrap up!",
    placement: "right",
    clickToContinue: true,
  },
  {
    targetId: null,
    title: "Tour Complete! 🎉",
    body: "You're ready to set sail.", // Replaced by dynamic body in component
    cta: "Finish Tour",
    placement: "center",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface OnboardingTourProps {
  enrolledCount: number;
}

export default function OnboardingTour({ enrolledCount }: OnboardingTourProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const done = localStorage.getItem(TOUR_KEY) === "true";
    if (!isMobile && !done) setActive(true);
  }, []);

  // Listen for manual restart event
  useEffect(() => {
    const handleRestart = () => {
      setStepIndex(0);
      setActive(true);
      // Small delay for DOM layout before computing rect
      setTimeout(updateRect, 50);
    };
    window.addEventListener("restart-tour", handleRestart);
    return () => window.removeEventListener("restart-tour", handleRestart);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = STEPS[stepIndex];

  const updateRect = useCallback(() => {
    if (!active || !currentStep?.targetId) {
      setRect(null);
      return;
    }
    const el = document.getElementById(currentStep.targetId);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [active, currentStep]);

  // Sync rect on scroll/resize/mutation
  useEffect(() => {
    if (!active) return;
    
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    
    observerRef.current = new MutationObserver(updateRect);
    observerRef.current.observe(document.body, { childList: true, subtree: true, attributes: true });

    updateRect();

    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      observerRef.current?.disconnect();
    };
  }, [active, updateRect]);

  const advance = useCallback(() => {
    const next = stepIndex + 1;

    if (next >= STEPS.length) {
      localStorage.setItem(TOUR_KEY, "true");
      setActive(false);
      router.push("/dashboard");
      window.dispatchEvent(new Event("enrollment-changed"));
      return;
    }

    setStepIndex(next);
  }, [stepIndex, router]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "true");
    setActive(false);
    router.push("/dashboard");
    window.dispatchEvent(new Event("enrollment-changed"));
  }, [router]);

  // Click detector for transitions
  useEffect(() => {
    if (!active || !currentStep?.clickToContinue || !currentStep?.targetId) return;

    const el = document.getElementById(currentStep.targetId);
    if (!el) return;

    const onElementClick = () => {
      setTimeout(advance, 10);
    };
    el.addEventListener("click", onElementClick, { once: true });
    return () => el.removeEventListener("click", onElementClick);
  }, [active, currentStep, advance]);

  if (!active) return null;

  // Tooltip Pos
  const getPos = () => {
    if (!rect || currentStep.placement === "center") {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 10; // Closer for lite feel
    let top = 0, left = 0;

    if (currentStep.placement === "right") { top = rect.top; left = rect.right + GAP; }
    else if (currentStep.placement === "bottom") { top = rect.bottom + GAP; left = rect.left; }
    else if (currentStep.placement === "top") { top = rect.top - CARD_H - GAP; left = rect.left; }
    
    // Clamping
    left = Math.min(Math.max(left, PAD), vw - CARD_W - PAD);
    top = Math.min(Math.max(top, PAD), vh - CARD_H - PAD);
    return { top, left };
  };

  const isLast = stepIndex === STEPS.length - 1;
  const bodyText = isLast && enrolledCount === 0 
    ? "Now that the demo class is gone, try adding a real class from the search bar to get started! 🏴‍☠️"
    : currentStep.body;

  return (
    <>
      {(!currentStep.targetId || currentStep.placement === "center") && (
        <div className="fixed inset-0 z-[9997] bg-black/40 backdrop-blur-[1px]" />
      )}

      {currentStep.targetId && rect && (
        <>
          <div 
            className="fixed z-[9998] rounded-xl ring-2 ring-ecu-purple ring-offset-2 ring-offset-transparent transition-all pointer-events-none"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }}
          />
          {currentStep.clickToContinue && (
            <div 
              className="fixed z-[9999] bg-ecu-purple text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-bounce pointer-events-none"
              style={{ top: rect.top - 24, left: rect.left + rect.width / 2, transform: "translateX(-50%)" }}
            >
              CLICK! 👆
            </div>
          )}
        </>
      )}

      <div
        style={{ ...getPos(), width: CARD_W }}
        className="fixed z-[9999] bg-background/90 backdrop-blur-md border border-border/60 rounded-xl shadow-xl p-5 animate-in fade-in zoom-in-95 duration-200"
      >
        <h3 className="font-bold text-sm mb-1.5">{currentStep.title}</h3>
        <p className="text-[11px] text-muted-foreground mb-4 leading-normal">{bodyText}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-0.5 rounded-full transition-all ${i === stepIndex ? "w-3 bg-ecu-purple" : "w-0.5 bg-border"}`} />
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            {!isLast && (
              <button onClick={handleSkip} className="text-[10px] text-muted-foreground hover:text-foreground font-medium underline-offset-2 hover:underline">Skip</button>
            )}
            {!currentStep.clickToContinue && (
              <button 
                onClick={() => advance()} 
                className="bg-ecu-purple/10 text-ecu-purple hover:bg-ecu-purple/20 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-ecu-purple/20 transition-colors"
              >
                {currentStep.cta || (isLast ? "Ready!" : "Next")}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}
