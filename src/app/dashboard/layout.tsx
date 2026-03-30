"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import React, { useState, useEffect, useCallback } from 'react';
import OnboardingTour from '@/components/ui/OnboardingTour';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name || 'Student';
  const userInitial = userName.charAt(0).toUpperCase();

  // Basic logic to determine if we are in a specific class
  const classMatch = pathname.match(/\/dashboard\/classes\/([^/]+)/);
  const activeClass = classMatch ? classMatch[1] : null;

  // Dynamic Class Fetching
  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTourClass, setShowTourClass] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Check if tour is complete to show/hide the onboarding class
    const tourDone = localStorage.getItem("thecrowsnest_tour_complete") === "true";
    setShowTourClass(!tourDone);
  }, [pathname, refreshKey]);

  useEffect(() => {
    fetch("/api/admin/verify")
      .then(res => res.json())
      .then(data => setIsAdmin(data.isAdmin))
      .catch(err => console.error("Admin verify failed", err));
  }, []);

  // Fetch classes from API using a fresh DB call (bypasses stale useSession cache)
  const loadClasses = useCallback(async () => {
    try {
      const [classesRes, enrolledRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/user/enrolled"),
      ]);
      if (classesRes.ok && enrolledRes.ok) {
        const classesData = await classesRes.json();
        const enrolledData = await enrolledRes.json();
        const enrolledIds = enrolledData.data?.enrolledClasses || [];
        const myClasses = classesData.data.classes.filter((c: any) =>
          enrolledIds.includes(c.classId)
        );
        setEnrolledClasses(myClasses);
      }
    } catch (e) {
      console.error("Failed to load layout classes", e);
    }
  }, []);

  // Re-fetch when route changes, session updates, or enrollment event fires
  useEffect(() => {
    loadClasses();
  }, [loadClasses, refreshKey, pathname]);

  // Listen for custom enrollment-changed events from enroll/unenroll actions
  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener("enrollment-changed", handler);
    return () => window.removeEventListener("enrollment-changed", handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-background flex flex-col md:flex shadow-sm">
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <span className="text-ecu-purple drop-shadow-sm">TheCrows</span>
            <span className="text-ecu-gold drop-shadow-sm">Nest</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link
            id="tour-my-classes"
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg shadow-sm border ${!activeClass && pathname === '/dashboard' ? 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/20' : 'text-foreground border-transparent hover:border-border hover:bg-muted/30'
              }`}
          >
            <span className="text-xl">📚</span> My Classes
          </Link>

          {/* Enrolled Classes List — directly under My Classes */}
          <div className="pl-4 space-y-1">
            {showTourClass && (
              <div key="onboarding101">
                <Link 
                  id="tour-onboarding-class"
                  href="/dashboard/classes/onboarding101" 
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors border ${activeClass === 'onboarding101' ? 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/20 font-bold shadow-sm' : 'text-muted-foreground border-border/40 hover:bg-muted hover:border-border/80 font-medium'}`}
                >
                  <span>🎓</span> Onboarding 101
                </Link>
                {activeClass === 'onboarding101' && (
                  <div className={`pl-6 mt-1.5 space-y-1 border-l-2 border-ecu-purple/20 ml-4 mb-2`}>
                    <Link href="/dashboard/classes/onboarding101/study-plans" className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/30">Study Plans</Link>
                    <Link href="/dashboard/classes/onboarding101/practice-exams" className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/30">Practice Exams</Link>
                    <Link href="/dashboard/classes/onboarding101/flashcards" className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/30">Flashcards</Link>
                    <Link href="/dashboard/classes/onboarding101/ai-tutor" className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/30">AI Study Tutor</Link>
                  </div>
                )}
              </div>
            )}
            {enrolledClasses.map((cls, idx) => {
              const isGold = idx % 2 !== 0;
              const activeBg = isGold ? 'bg-ecu-gold/10 text-ecu-gold border-ecu-gold/30' : 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/20';
              const activeLBorder = isGold ? 'border-ecu-gold/30' : 'border-ecu-purple/20';
              const activeText = isGold ? 'text-ecu-gold' : 'text-ecu-purple';

              let icon = "📚";
              if (cls.department.includes("Computer") || cls.courseCode.includes("CSCI")) icon = "💻";
              else if (cls.department.includes("Math") || cls.courseCode.includes("MATH")) icon = "📐";
              else if (cls.courseCode.includes("ENGL") || cls.department.includes("English")) icon = "📝";
              else if (cls.courseCode.includes("BIOL") || cls.courseCode.includes("CHEM") || cls.department.includes("Science")) icon = "🔬";

              return (
                <div key={cls.classId}>
                  <Link href={`/dashboard/classes/${cls.classId}`} className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors border ${activeClass === cls.classId ? `${activeBg} font-bold shadow-sm` : 'text-muted-foreground border-border/40 hover:bg-muted hover:border-border/80 font-medium'}`}>
                    <span>{icon}</span> {cls.courseCode}
                  </Link>
                  {activeClass === cls.classId && (
                    <div className={`pl-6 mt-1.5 space-y-1 border-l-2 ${activeLBorder} ml-4 mb-2`}>
                      <Link href={`/dashboard/classes/${cls.classId}/study-plans`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname.includes('study-plans') ? `${activeText} font-semibold bg-muted/50` : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                        Study Plans
                      </Link>
                      <Link href={`/dashboard/classes/${cls.classId}/practice-exams`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname.includes('practice-exams') ? `${activeText} font-semibold bg-muted/50` : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                        Practice Exams
                      </Link>
                      <Link href={`/dashboard/classes/${cls.classId}/flashcards`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname.includes('flashcards') ? `${activeText} font-semibold bg-muted/50` : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                        Flashcards
                      </Link>
                      <Link href={`/dashboard/classes/${cls.classId}/ai-tutor`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname.includes('ai-tutor') ? `${activeText} font-semibold bg-muted/50` : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                        AI Study Tutor
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Link
            id="tour-requests"
            href="/dashboard/requests"
            className={`flex items-center gap-3 px-3 py-2.5 mt-2 font-semibold rounded-lg shadow-sm border ${pathname.startsWith('/dashboard/requests') ? 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/20' : 'text-foreground border-transparent hover:border-border hover:bg-muted/30'
              }`}
          >
            <span className="text-xl">⏳</span> Pending Requests
          </Link>

          <div className="mt-8 pt-4 border-t border-border/40 space-y-2">
            {isAdmin && (
              <Link
                href="/dashboard/admin"
                className={`flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg shadow-sm border ${pathname.startsWith('/dashboard/admin') ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'text-foreground border-transparent hover:border-border hover:bg-muted/30'}`}
              >
                <span className="text-xl">🛡️</span> Admin Mode
              </Link>
            )}
            <Link
              id="tour-profile"
              href="/dashboard/profile"
              className={`flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg shadow-sm border ${pathname === '/dashboard/profile' ? 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/20' : 'text-foreground border-transparent hover:border-border hover:bg-muted/30'
                }`}
            >
              <span className="text-xl">⚙️</span> Settings & Profile
            </Link>
          </div>
        </nav>
        <div className="p-6 border-t border-border text-xs text-muted-foreground font-medium">
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Topbar */}
        <header className="h-16 shrink-0 border-b border-border bg-background/80 backdrop-blur-lg flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center md:hidden">
            <span className="font-bold text-lg tracking-tight">
              <span className="text-ecu-purple">TheCrows</span>
              <span className="text-ecu-gold">Nest</span>
            </span>
          </div>
          <div className="flex-1"></div> {/* Spacer */}

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 mr-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 border border-border/50 rounded-full text-[11px] font-bold text-muted-foreground group hover:border-ecu-purple/30 hover:bg-ecu-purple/5 transition-all duration-300">
                <span className="text-sm group-hover:scale-110 transition-transform">☁️</span>
                <span className="opacity-70">Storage:</span>
                <span className="text-foreground">750MB / 1GB</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 border border-border/50 rounded-full text-[11px] font-bold text-muted-foreground group hover:border-ecu-gold/30 hover:bg-ecu-gold/5 transition-all duration-300">
                <span className="text-sm group-hover:scale-110 transition-transform">⚡</span>
                <span className="opacity-70">AI:</span>
                <span className="text-foreground">12 / 20</span>
              </div>
            </div>
            <div className="relative" ref={profileMenuRef}>
              <button 
                id="tour-topbar-avatar" 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 px-1.5 py-1.5 bg-background border border-border shadow-xs rounded-full cursor-pointer hover:bg-muted/50 transition-all active:scale-95"
              >
                <span className="text-sm font-semibold text-foreground pl-3 hidden sm:inline-block">{userName}</span>
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-ecu-gold to-ecu-gold/80 flex items-center justify-center text-sm font-bold text-ecu-purple shadow-inner border border-ecu-gold">
                  {userInitial}
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                  <div className="p-4 border-b border-border bg-muted/30">
                    <p className="text-sm font-bold text-foreground">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                  </div>
                  <div className="p-2">
                    <Link 
                      href="/dashboard/profile" 
                      onClick={() => setShowProfileMenu(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-ecu-purple/10 hover:text-ecu-purple transition-colors group"
                    >
                      <span className="text-lg opacity-70 group-hover:opacity-100">⚙️</span>
                      Profile Settings
                    </Link>
                    <button 
                      onClick={() => { setShowProfileMenu(false); alert("Billing — coming soon!"); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-ecu-gold/10 hover:text-ecu-gold transition-colors group cursor-pointer"
                    >
                      <span className="text-lg opacity-70 group-hover:opacity-100">💎</span>
                      Subscription
                    </button>
                    <button 
                      onClick={() => { setShowProfileMenu(false); alert("Help Center — coming soon!"); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-muted/60 transition-colors group cursor-pointer"
                    >
                      <span className="text-lg opacity-70 group-hover:opacity-100">❓</span>
                      Help Center
                    </button>
                  </div>
                  <div className="p-2 bg-muted/20 border-t border-border">
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-500 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <span className="text-lg">🚪</span>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 lg:p-10">
          {children}
        </main>
      </div>

      {/* Onboarding Tour — rendered at layout level so it spans the full viewport */}
      <OnboardingTour enrolledCount={enrolledClasses.length} />
    </div>
  );
}
