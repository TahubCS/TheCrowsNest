"use client";

import { usePathname } from "next/navigation";
import NodeEdgeCanvas from "@/components/NodeEdgeCanvas";
import LandingAnimation from "@/components/LandingAnimation";

export default function BackgroundWrapper() {
  const pathname = usePathname();

  // Show background on landing, login, and signup pages
  const showBackground = ["/", "/login", "/signup"].includes(pathname);

  if (!showBackground) return null;

  return (
    <>
      <NodeEdgeCanvas />
      <LandingAnimation />
    </>
  );
}