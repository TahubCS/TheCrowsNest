"use client";

import { useEffect, useState, useCallback } from "react";

// --- Hardcoded sample data ---
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

// Quadrant positions (percentage-based, pushed to edges to avoid center content)
const QUADRANTS = [
  { top: "5%",  left: "2%"  },   // top-left corner
  { top: "5%",  left: "75%" },   // top-right corner
  { top: "70%", left: "2%"  },   // bottom-left corner
  { top: "70%", left: "75%" },   // bottom-right corner
  { top: "35%", left: "2%"  },   // mid-left
  { top: "35%", left: "78%" },   // mid-right
];

type ConnectionLine = {
  angle: number;
  length: number;
};

type CardState = {
  sample: typeof SAMPLES[0];
  position: typeof QUADRANTS[0];
  lines: ConnectionLine[];
  visible: boolean;
};

export default function StudyToolPreview() {
  const [card, setCard] = useState<CardState | null>(null);

  const spawnCard = useCallback(() => {
    const sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    const position = QUADRANTS[Math.floor(Math.random() * QUADRANTS.length)];

    // Generate 4-6 random connection lines radiating from the card
    const lineCount = 4 + Math.floor(Math.random() * 3);
    const lines: ConnectionLine[] = Array.from({ length: lineCount }, () => ({
      angle: Math.random() * 360,
      length: 40 + Math.random() * 60,
    }));

    // Set visible: false initially so the entrance animation can begin from scale(0)
    setCard({ sample, position, lines, visible: false });

    // Trigger the entrance animation shortly after mounting
    setTimeout(() => {
      setCard(prev => prev ? { ...prev, visible: true } : null);
    }, 50);

    // Fade out after 5 seconds
    setTimeout(() => {
      setCard(prev => prev ? { ...prev, visible: false } : null);
    }, 5000);

    // Fully remove after fade-out transition completes
    setTimeout(() => {
      setCard(null);
    }, 5800);
  }, []);

  useEffect(() => {
    // First card after 3 seconds
    const initialTimeout = setTimeout(spawnCard, 3000);

    // Then every 15 seconds
    const interval = setInterval(spawnCard, 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [spawnCard]);

  if (!card) return null;

  const { sample, position, lines, visible } = card;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 5,
        transition: visible 
          ? "opacity 0.2s ease, transform 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)" 
          : "opacity 0.2s ease 1.1s, transform 1.4s cubic-bezier(0.36, 0, 0.66, -0.56)",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0)",
      }}
    >
      {/* Constellation connection lines radiating outward */}
      {lines.map((line, i) => (
        <div 
          key={`line-${i}`} 
          className="absolute top-1/2 left-1/2 animate-spin" 
          style={{ 
            transform: "translate(-50%, -50%)",
            animationDuration: `${40 + (line.length % 20)}s`, // Slower, desynced sweeps
            animationDirection: i % 2 === 0 ? "normal" : "reverse"
          }}
        >
          {/* The line itself */}
          <div
            className="absolute origin-left"
            style={{
              width: line.length,
              height: "0.5px",
              background: `linear-gradient(90deg, rgba(89,42,138,0.35), transparent)`,
              transform: `rotate(${line.angle}deg)`,
              top: 0,
              left: 0,
            }}
          />
          {/* Terminal dot at the end of the line */}
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              width: 2.5,
              height: 2.5,
              background: "white",
              boxShadow: "0 0 6px rgba(255,255,255,0.5)",
              opacity: 0.6,
              transform: `rotate(${line.angle}deg) translateX(${line.length}px)`,
              top: -1,
              left: -1,
              animationDuration: `${2 + (i % 3)}s` // Desynced twinkling
            }}
          />
        </div>
      ))}

      {/* Corner dots (matching particle aesthetic) */}
      {[
        { top: -2, left: -2 },
        { top: -2, right: -2 },
        { bottom: -2, left: -2 },
        { bottom: -2, right: -2 },
      ].map((pos, i) => (
        <div
          key={`dot-${i}`}
          className="absolute rounded-full"
          style={{
            width: 3,
            height: 3,
            background: "white",
            boxShadow: "0 0 8px rgba(255,255,255,0.6), 0 0 16px rgba(89,42,138,0.3)",
            ...pos,
          }}
        />
      ))}

      {/* The card itself */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: 260,
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: `0 0 20px rgba(89,42,138,0.15), inset 0 0 20px rgba(255,255,255,0.02)`,
        }}
      >
        {/* Accent top border shimmer */}
        <div
          className="h-[2px] w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${sample.accent}, transparent)`,
            opacity: 0.6,
          }}
        />

        <div className="p-4 space-y-2">
          {/* Class badge */}
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

          {/* Action text */}
          <div className="flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">{sample.emoji}</span>
            <p className="text-[13px] text-white/70 leading-snug">{sample.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
