"use client";

import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

interface NodeEdgeCanvasProps {
  particleCount?: number;
  showLinks?: boolean;
  colors?: string[];
  className?: string;
}

export default function NodeEdgeCanvas({
  particleCount = 60,
  showLinks = true,
  colors = ["#ffffff", "#8a6bbf", "#d4b856"],
  className = ""
}: NodeEdgeCanvasProps) {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      background: {
        color: { value: "#05050A" },
      },
      fpsLimit: 120,
      interactivity: {
        events: {
          onClick: { enable: false },
          onHover: { enable: false },
        },
      },
      particles: {
        color: {
          value: colors,
        },
        links: {
          color: "#592A8A",
          distance: 180,
          enable: showLinks,
          opacity: 0.15,
          width: 0.8,
        },
        move: {
          direction: "outside",
          enable: true,
          outModes: { default: "out" },
          speed: 0.6,
          straight: false,
        },
        number: {
          density: { enable: true },
          value: particleCount,
        },
        opacity: {
          value: { min: 0.03, max: 0.5 },
        },
        shape: {
          type: "circle",
        },
        size: {
          value: { min: 0.8, max: 2.2 },
        },
      },
      detectRetina: true,
    }),
    [particleCount, showLinks, colors],
  );

  if (!init) {
    return <div className={`absolute inset-0 bg-[#05050A] z-0 pointer-events-none ${className}`} />;
  }

  return (
    <div className={`absolute inset-0 z-0 pointer-events-none ${className}`}>
      <Particles
        id="node-edge-canvas"
        options={options}
        className="h-full w-full"
      />
    </div>
  );
}