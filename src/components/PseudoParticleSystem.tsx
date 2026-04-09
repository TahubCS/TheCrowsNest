"use client";

import { useState, useEffect, useCallback } from "react";
import PseudoParticle from "./PseudoParticle";

interface PseudoParticleData {
  id: string;
  targetX: number;
  targetY: number;
  shouldActivate: boolean;
}

export default function PseudoParticleSystem() {
  const [isMounted, setIsMounted] = useState(false);
  const [particles, setParticles] = useState<PseudoParticleData[]>([]);
  const [centerX, setCenterX] = useState(0);
  const [centerY, setCenterY] = useState(0);

  const minTargetSpacing = 220;

  const getRandomInRange = (min: number, max: number) => min + Math.random() * Math.max(max - min, 1);

  const chooseTarget = useCallback((
    side: "left" | "right",
    existing: PseudoParticleData[],
    viewportWidth: number,
    viewportHeight: number,
  ) => {
    const cardHalfWidth = 130;
    const cardHalfHeight = 68;
    const horizontalPadding = 56;
    const verticalPadding = 32;

    const exclusionZones = [
      {
        left: viewportWidth * 0.24,
        right: viewportWidth * 0.76,
        top: viewportHeight * 0.1,
        bottom: viewportHeight * 0.5,
      },
      {
        left: viewportWidth * 0.3,
        right: viewportWidth * 0.7,
        top: viewportHeight * 0.42,
        bottom: viewportHeight * 0.84,
      },
    ];

    const xMin = side === "left"
      ? cardHalfWidth + horizontalPadding
      : viewportWidth * 0.62;
    const xMax = side === "left"
      ? viewportWidth * 0.34
      : viewportWidth - cardHalfWidth - horizontalPadding;
    const yMin = cardHalfHeight + verticalPadding;
    const yMax = viewportHeight - cardHalfHeight - 96;

    let candidateX = getRandomInRange(xMin, Math.max(xMax, xMin + 1));
    let candidateY = getRandomInRange(yMin, Math.max(yMax, yMin + 1));

    for (let attempt = 0; attempt < 20; attempt++) {
      const overlapsExisting = existing.some((item) => {
        const dx = item.targetX - candidateX;
        const dy = item.targetY - candidateY;
        return Math.hypot(dx, dy) < minTargetSpacing;
      });

      const intersectsExclusionZone = exclusionZones.some((zone) => {
        const cardLeft = candidateX - cardHalfWidth;
        const cardRight = candidateX + cardHalfWidth;
        const cardTop = candidateY - cardHalfHeight;
        const cardBottom = candidateY + cardHalfHeight;

        return !(
          cardRight < zone.left ||
          cardLeft > zone.right ||
          cardBottom < zone.top ||
          cardTop > zone.bottom
        );
      });

      if (!overlapsExisting && !intersectsExclusionZone) {
        break;
      }

      candidateX = getRandomInRange(xMin, Math.max(xMax, xMin + 1));
      candidateY = getRandomInRange(yMin, Math.max(yMax, yMin + 1));
    }

    return { targetX: candidateX, targetY: candidateY };
  }, []);

  // Generate initial pseudo-particles that will fly out from the center
  const generateParticles = useCallback((forceViewportHeight?: number) => {
    const newParticles: PseudoParticleData[] = [];
    const count = 2 + Math.floor(Math.random() * 2); // 2-3 pseudo-particles

    const viewportWidth = window.innerWidth;
    const viewportHeight = forceViewportHeight ?? window.innerHeight;

    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? "left" : "right";
      const target = chooseTarget(side, newParticles, viewportWidth, viewportHeight);

      newParticles.push({
        id: `pseudo-${i}-${Date.now()}`,
        targetX: target.targetX,
        targetY: target.targetY,
        shouldActivate: false,
      });
    }

    setParticles(newParticles);
  }, [chooseTarget]);

  // Handle particle completion (when it shrinks back and exits)
  const handleParticleComplete = useCallback((id: string) => {
    // Move particle to a new target location and schedule reactivation
    setTimeout(() => {
      setParticles(prev => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const side = Math.random() < 0.5 ? "left" : "right" as const;
        const existing = prev.filter((p) => p.id !== id);
        const target = chooseTarget(side, existing, viewportWidth, viewportHeight);

        return prev.map(p =>
          p.id === id
            ? {
                ...p,
                targetX: target.targetX,
                targetY: target.targetY,
                shouldActivate: false,
              }
            : p
        );
      });

      // Schedule reactivation after respawn delay
      setTimeout(() => {
        setParticles(prev =>
          prev.map(p =>
            p.id === id
              ? { ...p, shouldActivate: true }
              : p
          )
        );
      }, 8000 + Math.random() * 12000); // 8-20 seconds
    }, 100); // Small delay to ensure state reset
  }, [chooseTarget]);

  // Schedule initial activations
  useEffect(() => {
    let timeoutId: number;
    
    if (!isMounted) {
      timeoutId = window.setTimeout(() => {
        setIsMounted(true);
        setCenterX(window.innerWidth / 2);
        setCenterY(window.innerHeight / 2);
        generateParticles(window.innerHeight);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    
    if (particles.length === 0) return;

    particles.forEach((particle, index) => {
      const delay = 1800 + index * 4200 + Math.random() * 2600; // wider stagger to avoid grouped reveals
      timeoutId = window.setTimeout(() => {
        setParticles(prev =>
          prev.map(p =>
            p.id === particle.id
              ? { ...p, shouldActivate: true }
              : p
          )
        );
      }, delay);
    });
    
    // Using an empty clean up here specifically for the individual delayed reveals since they are fire-and-forget for this specific component
  }, [particles, isMounted, generateParticles]); // Only run when particles are first created

  useEffect(() => {
    // Regenerate on window resize
    const handleResize = () => {
      generateParticles();
      setCenterX(window.innerWidth / 2);
      setCenterY(window.innerHeight / 2);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [generateParticles, isMounted]);

  if (!isMounted) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-5">
      {particles.map(particle => (
        <PseudoParticle
          key={particle.id}
          id={particle.id}
          targetX={particle.targetX}
          targetY={particle.targetY}
          shouldActivate={particle.shouldActivate}
          centerX={centerX}
          centerY={centerY}
          onComplete={handleParticleComplete}
        />
      ))}
    </div>
  );
}
