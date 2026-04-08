"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ECU_MAJORS, STUDY_LEVELS, YEARS_OF_STUDY } from "@/lib/data/ecu-majors";
import type { CourseClass } from "@/types";

export default function OnboardingPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState<string>("Undergraduate");
  const [major, setMajor] = useState<string>(ECU_MAJORS[0]?.name || "Computer Science");
  const [year, setYear] = useState<string>("Freshman");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedClassData, setSelectedClassData] = useState<CourseClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CourseClass[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search against the DB
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/classes?search=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (json.success) {
          setSearchResults(json.data.classes as CourseClass[]);
        }
      } catch {
        // silent — search failure shouldn't block completion
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const toggleClass = (cls: CourseClass) => {
    if (selectedClasses.includes(cls.classId)) {
      setSelectedClasses((prev) => prev.filter((id) => id !== cls.classId));
      setSelectedClassData((prev) => prev.filter((c) => c.classId !== cls.classId));
    } else {
      setSelectedClasses((prev) => [...prev, cls.classId]);
      setSelectedClassData((prev) => [...prev, cls]);
    }
  };

  const totalCredits = selectedClassData.reduce((sum, c) => sum + (c.creditHours ?? 0), 0);

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

      // Update the JWT so the proxy sees onboardingComplete=true before redirect
      await updateSession({ onboardingComplete: true, major, yearOfStudy: year });
      // Hard navigation ensures the browser sends the refreshed JWT cookie
      // to the proxy on the very next request (router.push can race the cookie update)
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
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
            <div className={`h-2.5 rounded-full w-12 transition-colors ${step >= 1 ? "bg-ecu-purple" : "bg-muted"}`} />
            <div className={`h-2.5 rounded-full w-12 transition-colors ${step >= 2 ? "bg-ecu-gold" : "bg-muted"}`} />
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
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            <div>
              <h2 className="text-2xl font-bold">Find Your Classes</h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                Search for classes to add to your schedule.
              </p>
            </div>

            {/* Search bar */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by course code, name, or department..."
                className="w-full h-11 pl-9 pr-4 rounded-lg border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-ecu-purple focus:outline-none shadow-sm placeholder:text-muted-foreground"
              />
              {isSearching && (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </div>

            {/* Selected chips */}
            {selectedClassData.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedClassData.map((cls) => (
                  <span
                    key={cls.classId}
                    onClick={() => toggleClass(cls)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ecu-purple/10 border border-ecu-purple/30 text-ecu-purple text-xs font-semibold cursor-pointer hover:bg-ecu-purple/20 transition-colors"
                  >
                    {cls.courseCode}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                ))}
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                  {totalCredits} credits
                </span>
              </div>
            )}

            {/* Results */}
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {searchQuery.trim().length < 2 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <svg className="w-8 h-8 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm font-medium">Type at least 2 characters to search</p>
                </div>
              ) : searchResults.length === 0 && !isSearching ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="text-sm font-medium">No classes found for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              ) : (
                searchResults.map((cls) => {
                  const selected = selectedClasses.includes(cls.classId);
                  return (
                    <div
                      key={cls.classId}
                      onClick={() => toggleClass(cls)}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selected
                          ? "border-ecu-purple bg-ecu-purple/5"
                          : "border-border hover:border-ecu-purple/40 bg-background"
                      }`}
                    >
                      <div className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center shrink-0 border-2 transition-colors ${
                        selected ? "bg-ecu-purple border-ecu-purple text-white" : "border-muted-foreground/30 bg-background"
                      }`}>
                        {selected && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-base text-foreground tracking-tight">{cls.courseCode}</span>
                          <span className="text-xs bg-ecu-gold/20 px-2 py-0.5 rounded-md font-bold text-ecu-purple">{cls.creditHours} Credits</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{cls.courseName}</p>
                        {cls.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cls.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

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
            </div>
            {error && (
              <p className="text-sm text-red-500 font-medium text-center mt-3">{error}</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
