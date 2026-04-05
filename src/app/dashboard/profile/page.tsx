"use client"

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { usePlan } from "@/hooks/usePlan";
import { resetTour } from "@/components/ui/OnboardingTour";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { plan } = usePlan();
  
  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [major, setMajor] = useState("Computer Science (BS)");
  const [yearOfStudy, setYearOfStudy] = useState("Freshman");
  
  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();

  const handleRestartTour = () => {
    resetTour();
    router.push("/dashboard");
    // Dispatch event to re-trigger the tour component in the layout
    window.dispatchEvent(new Event("restart-tour"));
  };

  // Initialize form from session
  useEffect(() => {
    if (session?.user) {
      const name = session.user.name || "";
      const [first, ...rest] = name.split(" ");
      setFirstName(first || "");
      setLastName(rest.join(" ") || "");
      setMajor(session.user.major || "Computer Science (BS)");
      setYearOfStudy(session.user.yearOfStudy || "Freshman");
    }
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          major,
          yearOfStudy,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Update the NextAuth session so the header/sidebar reflect changes immediately
        await update({
          name: fullName,
          major,
          yearOfStudy,
        });
        
        setMessage({ type: 'success', text: "Preferences saved successfully!" });
      } else {
        setMessage({ type: 'error', text: data.message || "Failed to save preferences." });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: "An error occurred while saving." });
    } finally {
      setIsSaving(false);
    }
  };

  const userEmail = session?.user?.email || "Loading...";

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Your Profile</h1>
        <p className="text-muted-foreground mt-2 text-lg">Manage your personal information and academic preferences.</p>
      </div>

      <div className="max-w-3xl bg-background rounded-2xl border border-border p-8 shadow-sm relative overflow-hidden">
        {/* Subtle Decorative Gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-ecu-purple/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-ecu-gold/5 rounded-full -ml-16 -mb-16 blur-3xl"></div>

        <form onSubmit={handleSave} className="space-y-6 relative">
          {message && (
            <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${
              message.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
            }`}>
              <p className="text-sm font-semibold flex items-center gap-2">
                {message.type === 'success' ? '✓' : '⚠️'} {message.text}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                First Name
              </label>
              <Input 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex: PeeDee"
                className="bg-muted/30 border-border/60 focus:bg-background transition-all" 
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                Last Name
              </label>
              <Input 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex: Pirate"
                className="bg-muted/30 border-border/60 focus:bg-background transition-all" 
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">ECU Email</label>
            <Input 
              value={userEmail} 
              disabled 
              className="bg-muted-foreground/10 text-muted-foreground cursor-not-allowed border-dashed opacity-80" 
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Standard university email cannot be changed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border/60 mt-8">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ecu-purple">Academic Major</label>
              <div className="relative group">
                <select 
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="w-full h-11 px-3 appearance-none rounded-lg border border-border/60 bg-muted/30 group-hover:bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ecu-purple/30 focus:border-ecu-purple shadow-sm cursor-pointer transition-all"
                >
                  <option value="Computer Science (BS)">Computer Science (BS)</option>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Business Administration">Business Administration</option>
                  <option value="Nursing">Nursing</option>
                  <option value="Biology">Biology</option>
                  <option value="Mathematics">Mathematics</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground transition-transform group-hover:translate-y-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ecu-gold">Class Year</label>
              <div className="relative group">
                <select 
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className="w-full h-11 px-3 appearance-none rounded-lg border border-border/60 bg-muted/30 group-hover:bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ecu-gold/30 focus:border-ecu-gold shadow-sm cursor-pointer transition-all"
                >
                  <option value="Freshman">Freshman</option>
                  <option value="Sophomore">Sophomore</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Graduate">Graduate</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground transition-transform group-hover:translate-y-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex justify-end">
            <Button 
              type="submit" 
              disabled={isSaving}
              className="bg-ecu-purple hover:bg-ecu-purple/90 text-primary-foreground font-bold px-10 h-12 rounded-xl shadow-lg transition-all hover:shadow-ecu-purple/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : "Save Preferences"}
            </Button>
          </div>
        </form>
      </div>

      {/* Subscription/Plan Card */}
      <div className={`max-w-3xl rounded-2xl border-2 p-8 shadow-sm relative overflow-hidden ${
        plan === "premium" 
          ? "border-ecu-gold bg-ecu-gold/5" 
          : "border-border bg-background"
      }`}>
        {/* Decorative gradients */}
        {plan === "premium" && (
          <>
            <div className="absolute top-0 right-0 w-40 h-40 bg-ecu-gold/20 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-ecu-purple/10 rounded-full -ml-20 -mb-20 blur-3xl"></div>
          </>
        )}
        
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                {plan === "premium" ? (
                  <>
                    <span className="text-xl">👑</span> Your Premium Plan
                  </>
                ) : (
                  <>
                    <span className="text-xl">🚀</span> Free Plan
                  </>
                )}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {plan === "premium"
                  ? "You have access to all premium features including AI tools with daily quotas."
                  : "Access community resources and shared materials. Upgrade to unlock AI-powered study tools."}
              </p>
              
              {/* Plan features summary */}
              <div className="mt-4 space-y-2">
                {plan === "premium" ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <svg className="w-4 h-4 text-ecu-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>25 AI chat messages per day</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <svg className="w-4 h-4 text-ecu-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>5 custom flashcard generations daily</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <svg className="w-4 h-4 text-ecu-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>5 custom exam generations daily</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <svg className="w-4 h-4 text-ecu-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>5 custom study plan generations daily</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Unlimited material uploads</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Community shared resources</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Pre-generated study materials</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="shrink-0 flex gap-3">
              {plan === "premium" ? (
                <Button
                  onClick={() => router.push("/pricing")}
                  className="bg-ecu-gold hover:bg-ecu-gold/90 text-slate-900 font-bold"
                >
                  Manage Plan
                </Button>
              ) : (
                <Link href="/pricing">
                  <Button className="bg-ecu-purple hover:bg-ecu-purple/90 text-white font-bold">
                    Upgrade to Premium
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Restart Tour Card */}
      <div className="max-w-3xl bg-background rounded-2xl border border-border p-8 shadow-sm">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Platform Tour</h2>
            <p className="text-sm text-muted-foreground mt-1">Forgotten how something works? Replay the guided intro tour at any time.</p>
          </div>
          <Button
            onClick={handleRestartTour}
            variant="outline"
            className="shrink-0 border-ecu-purple text-ecu-purple hover:bg-ecu-purple/10 font-semibold"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Restart Tour
          </Button>
        </div>
      </div>
    </div>
  );
}

