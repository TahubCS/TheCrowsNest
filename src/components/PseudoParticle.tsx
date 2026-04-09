"use client";

import { useState, useEffect } from "react";

// Sample data for boxes
const SAMPLES = [
  { className: "CSCI 1010", text: "Document upload successful", emoji: "📄", accent: "#8a6bbf" },
  { className: "CSCI 3000", text: "Generating practice exam...", emoji: "🧠", accent: "#8a6bbf" },
  { className: "CSCI 3000", text: "Q1/15: How is a 'process' generally defined?", emoji: "❓", accent: "#8a6bbf" },
  { className: "MATH 1065", text: "Study guide — 12 key concepts identified", emoji: "📝", accent: "#d4b856" },
  { className: "BIOL 1050", text: "Flashcard deck ready — 45 cards", emoji: "🃏", accent: "#5aab7b" },
  { className: "ENGL 1100", text: "Essay outline from uploaded notes", emoji: "✨", accent: "#c27a5a" },
  { className: "ECON 2113", text: "Practice quiz: Supply & Demand — 85%", emoji: "📊", accent: "#d4b856" },
  { className: "PSYC 1000", text: "Chapter review summary generated", emoji: "📋", accent: "#7aabd4" },
  { className: "CHEM 1150", text: "Lab report template created", emoji: "🔬", accent: "#5aab7b" },
];

type PseudoParticleState = "dot" | "expanding" | "box" | "collapsing" | "departing";

interface PseudoParticleProps {
  id: string;
  targetX: number;
  targetY: number;
  onComplete: (id: string) => void;
  shouldActivate: boolean;
  centerX: number;
  centerY: number;
}

const DOT_COLORS = [
  "rgba(255,255,255,0.45)",
  "rgba(138,107,191,0.38)",
  "rgba(212,184,86,0.32)",
];

export default function PseudoParticle({ id, targetX, targetY, onComplete, shouldActivate, centerX, centerY }: PseudoParticleProps) {
  const [state, setState] = useState<PseudoParticleState>("dot");
  const [sample, setSample] = useState<typeof SAMPLES[0] | null>(null);
  const [dotColor, setDotColor] = useState<string>(DOT_COLORS[0]);
  const [travelProgress, setTravelProgress] = useState(0);
  const [cardMorphProgress, setCardMorphProgress] = useState(0);
  const [departureProgress, setDepartureProgress] = useState(0);

  useEffect(() => {
    if (shouldActivate && state === "dot") {
      const newSample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
      const newDotColor = DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)];
      
      // Use a microtask to defer state updates after render
      queueMicrotask(() => {
        setSample(newSample);
        setDotColor(newDotColor);
        setTravelProgress(0);
        setCardMorphProgress(0);
        setDepartureProgress(0);
        setState("expanding");
      });
    }
  }, [shouldActivate, state]);

  useEffect(() => {
    if (state === "departing") {
      const duration = 2600;
      const startTime = Date.now();

      const interval = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setDepartureProgress(progress);

        if (progress >= 1) {
          window.clearInterval(interval);
          setState("dot");
          setSample(null);
          setTravelProgress(0);
          setCardMorphProgress(0);
          setDepartureProgress(0);
          onComplete(id);
        }
      }, 16);

      return () => window.clearInterval(interval);
    }
    return undefined;
  }, [state, id, onComplete]);

  useEffect(() => {
    if (state === "expanding") {
      const duration = 7600;
      const startTime = Date.now();

      const interval = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setTravelProgress(progress);

        if (progress >= 1) {
          window.clearInterval(interval);
          setCardMorphProgress(0);
          setState("box");
        }
      }, 16);

      return () => window.clearInterval(interval);
    }

    return undefined;
  }, [state]);

  useEffect(() => {
    if (state === "box") {
      const duration = 260;
      const startTime = Date.now();

      const interval = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setCardMorphProgress(progress);

        if (progress >= 1) {
          window.clearInterval(interval);
        }
      }, 16);

      const timer = window.setTimeout(() => setState("collapsing"), 4200);

      return () => {
        window.clearInterval(interval);
        window.clearTimeout(timer);
      };
    }
    return undefined;
  }, [state]);

  useEffect(() => {
    if (state === "collapsing") {
      const duration = 320;
      const startTime = Date.now();

      const interval = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setCardMorphProgress(1 - progress);

        if (progress >= 1) {
          window.clearInterval(interval);
          setDepartureProgress(0);
          setState("departing");
        }
      }, 16);

      return () => window.clearInterval(interval);
    }
    return undefined;
  }, [state]);

  useEffect(() => {
    if (state === "departing") {
      const duration = 2600;
      const startTime = Date.now();

      const interval = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setDepartureProgress(progress);

        if (progress >= 1) {
          window.clearInterval(interval);
          setState("dot");
          setSample(null);
          setTravelProgress(0);
          setCardMorphProgress(0);
          setDepartureProgress(0);
          onComplete(id);
        }
      }, 16);

      return () => window.clearInterval(interval);
    }
    return undefined;
  }, [state, id, onComplete]);

  const dotSize = 6;
  const cardWidth = 260;
  const cardHeight = 136;
  const morphGlowSize = 10 + cardMorphProgress * 20;
  const directionX = targetX - centerX;
  const directionY = targetY - centerY;
  const departureDistance = 260;
  const currentX = centerX + directionX * travelProgress;
  const currentY = centerY + directionY * travelProgress;
  const normalizedLength = Math.max(Math.hypot(directionX, directionY), 1);
  const normalizedDirectionX = directionX / normalizedLength;
  const normalizedDirectionY = directionY / normalizedLength;
  const departureX = targetX + normalizedDirectionX * departureProgress * departureDistance;
  const departureY = targetY + normalizedDirectionY * departureProgress * departureDistance;
  const cardLeft = targetX - cardWidth / 2;
  const cardTop = targetY - cardHeight / 2;
  const isTraveling = state === "expanding";
  const isMorphingIn = state === "box" && cardMorphProgress < 1;
  const isDeparting = state === "departing";
  const isBoxVisible = state === "box" || state === "collapsing";
  const cardScale = 0.28 + cardMorphProgress * 0.72;
  const cardOpacity = 0.15 + cardMorphProgress * 0.85;
  const cardTranslateY = state === "collapsing"
    ? (1 - cardMorphProgress) * -10
    : (1 - cardMorphProgress) * 10;
  const cardRotate = state === "collapsing"
    ? -(1 - cardMorphProgress) * 3
    : (1 - cardMorphProgress) * 3;
  const shellScaleX = state === "collapsing"
    ? 1 - (1 - cardMorphProgress) * 0.3
    : 0.45 + cardMorphProgress * 0.55;
  const shellScaleY = state === "collapsing"
    ? 1 - (1 - cardMorphProgress) * 0.65
    : 0.18 + cardMorphProgress * 0.82;
  const shellOpacity = state === "collapsing"
    ? 0.2 + cardMorphProgress * 0.45
    : 0.18 + cardMorphProgress * 0.4;
  const dotOpacity = state === "dot"
    ? 0
    : isTraveling
      ? 0.45
      : isMorphingIn
        ? 0.3 * (1 - cardMorphProgress)
        : isDeparting
          ? 0.9 - departureProgress * 0.3
          : 0;
  const dotScale = isTraveling
    ? 1
    : isMorphingIn
      ? 1 - cardMorphProgress * 0.6
      : isDeparting
        ? 1.6 - departureProgress * 0.25
        : 0.4;

  return (
    <>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: (isDeparting ? departureX : currentX) - dotSize / 2,
          top: (isDeparting ? departureY : currentY) - dotSize / 2,
          width: dotSize,
          height: dotSize,
          background: dotColor,
          opacity: dotOpacity,
          transform: `scale(${dotScale})`,
          boxShadow: isDeparting
            ? `0 0 22px ${dotColor}, 0 0 42px ${dotColor}`
            : isMorphingIn
              ? `0 0 ${morphGlowSize}px ${dotColor}, 0 0 ${morphGlowSize + 10}px ${dotColor}`
              : `0 0 12px ${dotColor}`,
          transition: isDeparting ? "none" : "opacity 180ms ease, transform 180ms ease",
        }}
      />

      {sample && isBoxVisible ? (
        <div
          className="absolute pointer-events-none"
          style={{
            left: cardLeft,
            top: cardTop,
            zIndex: 10,
            transform: `translateY(${cardTranslateY}px) rotate(${cardRotate}deg) scale(${cardScale})`,
            opacity: cardOpacity,
            transformOrigin: "center center",
            transition: state === "collapsing"
              ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease"
              : "none",
          }}
        >
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              transform: `scaleX(${shellScaleX}) scaleY(${shellScaleY})`,
              opacity: shellOpacity,
              background: `radial-gradient(circle at center, ${sample.accent}22 0%, ${sample.accent}12 42%, transparent 75%)`,
              filter: "blur(8px)",
            }}
          />

          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              width: cardWidth,
              minHeight: cardHeight,
              background: "rgba(255,255,255,0.045)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: `0 0 ${8 + cardMorphProgress * 12}px rgba(89,42,138,0.14), inset 0 0 20px rgba(255,255,255,0.02)`,
            }}
          >
            <div
              className="h-0.5 w-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${sample.accent}, transparent)`,
                opacity: 0.7,
              }}
            />

            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase"
                  style={{
                    background: `${sample.accent}20`,
                    color: sample.accent,
                    border: `1px solid ${sample.accent}40`,
                  }}
                >
                  {sample.className}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-base leading-none mt-0.5">{sample.emoji}</span>
                <p className="text-[13px] text-white/70 leading-snug">{sample.text}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
