"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import React, { useState, useEffect, useCallback } from 'react';

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
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg shadow-sm border ${!activeClass && pathname === '/dashboard' ? 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/20' : 'text-foreground border-transparent hover:border-border hover:bg-muted/30'
              }`}
          >
            <span className="text-xl">📚</span> My Classes
          </Link>

          {/* Enrolled Classes List — directly under My Classes */}
          <div className="pl-4 space-y-1">
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
            <Link href="/dashboard/profile" className="flex items-center gap-3 px-1.5 py-1.5 bg-background border border-border shadow-sm rounded-full cursor-pointer hover:bg-muted/50 transition-colors">
              <span className="text-sm font-semibold text-foreground pl-3 hidden sm:inline-block">{userName}</span>
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-ecu-gold to-ecu-gold/80 flex items-center justify-center text-sm font-bold text-ecu-purple shadow-inner border border-ecu-gold">
                {userInitial}
              </div>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-xs text-muted-foreground hover:text-red-500 font-medium transition-colors cursor-pointer"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
