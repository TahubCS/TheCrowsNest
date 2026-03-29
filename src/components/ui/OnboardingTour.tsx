"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOUR_KEY = "thecrowsnest_tour_complete";
const CARD_W = 280; 
const CARD_H = 160; 
const PAD = 20;

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
    body: "Let's take a quick walk through TheCrowsNest. We'll show you how to find materials and use AI to ace your classes.",
    cta: "Start Tour →",
    placement: "center",
  },
  {
    targetId: "tour-my-classes",
    title: "My Classes",
    body: "Your home base. All the courses you've joined appear here. Click to return anytime.",
    placement: "right",
  },
  {
    targetId: "tour-onboarding-class",
    title: "Sample Class",
    body: "We've added 'Onboarding 101' so you can see a class in action. Click it to explore!",
    placement: "right",
    clickToContinue: true,
  },
  {
    targetId: "tour-upload-btn",
    title: "Materials",
    body: "Share lecture slides, notes, or syllabi. Every upload helps the AI learn more about your class.",
    placement: "bottom",
  },
  {
    targetId: "tour-material-row",
    title: "Class Feed",
    body: "Browse shared files. Hover a row to see the report flag or check out an uploader's profile.",
    placement: "top",
  },
  {
    targetId: "tour-study-tools",
    title: "AI Tools",
    body: "Instantly generate study plans, flashcards, and practice exams based on your class materials.",
    placement: "bottom",
  },
  {
    targetId: "tour-requests",
    title: "Track Requests",
    body: "This is where your pending class requests and reports can be viewed after they've been submitted. Remember to search for existing classes first before submitting a new request!",
    placement: "right",
    clickToContinue: true,
  },
  {
    targetId: "tour-profile",
    title: "Profile",
    body: "Manage your academic major and preferences here. Let's head back to the dashboard to finish up!",
    placement: "right",
    clickToContinue: true,
  },
  {
    targetId: null,
    title: "Ready to Start! 🚀",
    body: "You're all set. The demo class is gone — now try searching for your real classes to begin your journey!",
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

  useEffect(() => {
    const handleRestart = () => {
      setStepIndex(0);
      setActive(true);
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

    // Special logic for final step transition: Navigate to dashboard first
    if (next === STEPS.length - 1 && pathname !== "/dashboard") {
      router.push("/dashboard");
      // Delay setting the step index until the page roughly switches
      setTimeout(() => setStepIndex(next), 400);
      return;
    }

    setStepIndex(next);
  }, [stepIndex, router, pathname]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "true");
    setActive(false);
    router.push("/dashboard");
    window.dispatchEvent(new Event("enrollment-changed"));
  }, [router]);

  useEffect(() => {
    if (!active || !currentStep?.clickToContinue || !currentStep?.targetId) return;
    const el = document.getElementById(currentStep.targetId);
    if (!el) return;
    const onElementClick = () => setTimeout(advance, 10);
    el.addEventListener("click", onElementClick, { once: true });
    return () => el.removeEventListener("click", onElementClick);
  }, [active, currentStep, advance]);

  if (!active) return null;

  const getPos = () => {
    if (!rect || currentStep.placement === "center") {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 12; 
    let top = 0, left = 0;

    if (currentStep.placement === "right") { top = rect.top; left = rect.right + GAP; }
    else if (currentStep.placement === "bottom") { top = rect.bottom + GAP; left = rect.left; }
    else if (currentStep.placement === "top") { top = rect.top - CARD_H - GAP; left = rect.left; }
    
    left = Math.min(Math.max(left, PAD), vw - CARD_W - PAD);
    top = Math.min(Math.max(top, PAD), vh - CARD_H - PAD);
    return { top, left };
  };

  const isLast = stepIndex === STEPS.length - 1;

  return (
    <>
      {(!currentStep.targetId || currentStep.placement === "center") && (
        <div className="fixed inset-0 z-[9997] bg-black/30 backdrop-blur-[1px]" />
      )}

      {currentStep.targetId && rect && (
        <>
          <div 
            className="fixed z-[9998] rounded-2xl ring-2 ring-ecu-purple ring-offset-2 ring-offset-transparent transition-all pointer-events-none"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)" }}
          />
          {currentStep.clickToContinue && (
            <div 
              className="fixed z-[9999] bg-ecu-purple text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-bounce pointer-events-none"
              style={{ top: rect.top - 24, left: rect.left + rect.width / 2, transform: "translateX(-50%)" }}
            >
              TAP! 👆
            </div>
          )}
        </>
      )}

      <div
        style={{ ...getPos(), width: CARD_W }}
        className="fixed z-[9999] bg-white/95 backdrop-blur-sm border border-border shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[32px] p-6 animate-in fade-in zoom-in-95 duration-200"
      >
        <h3 className="font-bold text-sm mb-1.5 text-foreground leading-tight">{currentStep.title}</h3>
        <p className="text-[11px] text-muted-foreground mb-4 leading-normal">{currentStep.body}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === stepIndex ? "w-4 bg-ecu-purple/70" : "w-1 bg-border/50"}`} />
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            {!isLast && (
              <button onClick={handleSkip} className="text-[10px] text-muted-foreground hover:text-foreground font-medium underline-offset-2 hover:underline">Skip</button>
            )}
            {!currentStep.clickToContinue && (
              <button 
                onClick={() => advance()} 
                className="bg-ecu-purple text-white hover:bg-ecu-purple/90 text-[10px] font-bold px-4 py-1.5 rounded-full transition-all active:scale-95"
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
