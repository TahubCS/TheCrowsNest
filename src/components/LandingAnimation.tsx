"use client";

import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

export default function LandingAnimation() {
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
          value: ["#ffffff", "#8a6bbf", "#d4b856"],
        },
        links: {
          color: "#592A8A",
          distance: 150,
          enable: true,
          opacity: 0.08,
          width: 0.5,
        },
        move: {
          direction: "outside",
          enable: true,
          outModes: { default: "out" },
          speed: 0.8,
          straight: false,
        },
        number: {
          density: { enable: true },
          value: 80,
        },
        opacity: {
          value: { min: 0.05, max: 0.6 },
        },
        shape: {
          type: "circle",
        },
        size: {
          value: { min: 0.5, max: 2.5 },
        },
      },
      detectRetina: true,
    }),
    [],
  );

  if (!init) {
    return <div className="absolute inset-0 bg-[#05050A] z-0 pointer-events-none" />;
  }

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Particles
        id="landing-particles"
        options={options}
        className="h-full w-full"
      />
    </div>
  );
}
