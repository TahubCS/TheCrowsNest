import Link from "next/link";
import LandingAnimation from "@/components/LandingAnimation";
import PseudoParticleSystem from "@/components/PseudoParticleSystem";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#05050A] relative overflow-hidden">

      {/* 3D Infinity Tunnel Background */}
      <LandingAnimation />

      {/* Pseudo-particle system that becomes boxes */}
      <PseudoParticleSystem />

      <main className="z-10 flex flex-col items-center text-center space-y-12 p-8 max-w-3xl w-full">
        <div className="space-y-6">
          <div className="inline-block rounded-full bg-ecu-gold/20 px-4 py-1.5 backdrop-blur-md mb-4 border border-ecu-gold/30">
            <span className="text-sm font-medium text-ecu-purple dark:text-ecu-gold">
              Exclusively for ECU Students 🏴‍☠️
            </span>
          </div>
          <h1 className="text-6xl font-extrabold tracking-tighter sm:text-7xl xl:text-8xl bg-clip-text text-transparent bg-linear-to-r from-ecu-purple to-ecu-gold pb-2 drop-shadow-sm">
            The Crow&apos;s Nest
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Connect with thousands of ECU students to share notes, build study plans, and crush your exams.
          </p>
        </div>

        <div className="flex flex-col gap-6 mt-8 w-full max-w-md items-center bg-background/60 backdrop-blur-xl p-8 rounded-2xl border border-border shadow-2xl">
          <div className="w-full text-center">
            <h2 className="text-lg font-semibold text-foreground mb-1">Welcome aboard</h2>
            <p className="text-sm text-muted-foreground">Sign up or login to continue</p>
          </div>

          <div className="flex flex-col w-full gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-ecu-purple text-primary-foreground shadow-lg shadow-ecu-purple/20 hover:bg-ecu-purple/90 h-11 px-8 hover:-translate-y-0.5"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-background border-2 border-ecu-gold text-foreground shadow-sm hover:bg-ecu-gold/10 hover:border-ecu-gold h-11 px-8 hover:-translate-y-0.5"
            >
              Sign Up
            </Link>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2 px-4">
            *Requires a valid <span className="font-medium text-primary">@students.ecu.edu</span> email address to register.
          </p>
        </div>
      </main>

      <footer className="absolute bottom-6 text-sm text-muted-foreground font-medium z-10">
        © {new Date().getFullYear()} TheCrowsNest. Go Pirates!
      </footer>
    </div>
  );
}
