"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import majorClassData from "@/lib/data/major-class-map.json";
import { ECU_MAJORS, STUDY_LEVELS, YEARS_OF_STUDY } from "@/lib/data/ecu-majors";

export default function OnboardingPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState<string>("Undergraduate");
  const [major, setMajor] = useState<string>(ECU_MAJORS[0]?.name || "Computer Science");
  const [year, setYear] = useState<string>("Freshman");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Typecasting access due to dynamic keys
  const recommendedClasses = (majorClassData as any)[major]?.[year] || [];

  const toggleClass = (classId: string) => {
    setSelectedClasses(prev => 
      prev.includes(classId) ? prev.filter(c => c !== classId) : [...prev, classId]
    );
  };

  const completeOnboarding = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          major,
          yearOfStudy: year,
          enrolledClasses: selectedClasses,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong.");
        setLoading(false);
        return;
      }

      // Update the NextAuth session so it knows onboarding is now complete
      await updateSession({ onboardingComplete: true, major, yearOfStudy: year });

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 py-12">
      <div className="w-full max-w-2xl bg-background rounded-2xl shadow-xl border border-border p-8 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-3 font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
            <span className="text-ecu-purple">TheCrows</span>
            <span className="text-ecu-gold">Nest</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground">Set up your profile</h1>
          <p className="text-muted-foreground mt-2 font-medium">Step {step} of 2</p>
          <div className="flex gap-2 justify-center mt-5">
            <div className={`h-2.5 rounded-full w-12 transition-colors ${step >= 1 ? 'bg-ecu-purple' : 'bg-muted'}`} />
            <div className={`h-2.5 rounded-full w-12 transition-colors ${step >= 2 ? 'bg-ecu-gold' : 'bg-muted'}`} />
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Level of Study</label>
                <select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value);
                    // Reset year when level changes
                    const newYears = YEARS_OF_STUDY[e.target.value as keyof typeof YEARS_OF_STUDY] || [];
                    setYear(newYears[0] || "");
                  }}
                  className="w-full h-11 px-3 appearance-none rounded-lg border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-ecu-purple cursor-pointer shadow-sm"
                >
                  {STUDY_LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-ecu-purple">Academic Major</label>
                <select 
                  value={major} 
                  onChange={(e) => setMajor(e.target.value)}
                  className="w-full h-11 px-3 appearance-none rounded-lg border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-ecu-purple cursor-pointer shadow-sm"
                >
                  {ECU_MAJORS.map((m) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-ecu-gold">Class Year</label>
                <select 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full h-11 px-3 appearance-none rounded-lg border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-ecu-gold cursor-pointer shadow-sm"
                >
                  {(YEARS_OF_STUDY[level as keyof typeof YEARS_OF_STUDY] || []).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button 
              onClick={() => setStep(2)} 
              className="w-full h-12 bg-ecu-purple hover:bg-ecu-purple/90 text-white font-bold rounded-xl shadow-md mt-8 text-lg"
            >
              Next: Select Classes
            </Button>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">✨</span> Recommended for You
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 font-medium">Based on your program: <strong className="text-foreground">{major} ({year})</strong></p>
            </div>

            {recommendedClasses.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 rounded-xl [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-border">
                {recommendedClasses.map((cls: any) => (
                  <div 
                    key={cls.id} 
                    onClick={() => toggleClass(cls.id)}
                    className={`flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all shadow-sm ${
                      selectedClasses.includes(cls.id) 
                        ? 'border-ecu-purple bg-ecu-purple/5' 
                        : 'border-border hover:border-ecu-purple/40 bg-background'
                    }`}
                  >
                    <div className={`w-6 h-6 mt-0.5 rounded-md flex items-center justify-center shrink-0 border-2 transition-colors ${
                      selectedClasses.includes(cls.id) ? 'bg-ecu-purple border-ecu-purple text-white' : 'border-muted-foreground/30 bg-background'
                    }`}>
                      {selectedClasses.includes(cls.id) && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-lg text-foreground tracking-tight">{cls.code}</span>
                        <span className="text-xs bg-ecu-gold/20 px-2 py-0.5 rounded-md font-bold text-ecu-purple">{cls.credits} Credits</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{cls.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 bg-muted/20 rounded-xl border-2 border-dashed border-border">
                <p className="text-muted-foreground font-medium">No recommendations found for this specific major and year yet.</p>
              </div>
            )}

            <div className="flex gap-4 pt-4 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)} 
                className="flex-1 h-12 rounded-xl font-bold text-foreground border-border hover:bg-muted"
              >
                Back
              </Button>
              <Button 
                onClick={completeOnboarding}
                disabled={loading}
                className="flex-2 h-12 bg-ecu-gold text-ecu-purple hover:bg-ecu-gold/90 font-bold rounded-xl shadow-md text-base disabled:opacity-60"
              >
                {loading ? "Saving..." : `Complete Setup (${selectedClasses.length} selected)`}
              </Button>
              {error && (
                <p className="text-sm text-red-500 font-medium text-center w-full">{error}</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
