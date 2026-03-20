"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    async function loadClasses() {
      if (!session?.user?.enrolledClasses || session.user.enrolledClasses.length === 0) {
        setEnrolledClasses([]);
        return;
      }
      try {
        const res = await fetch("/api/classes");
        if (res.ok) {
          const data = await res.json();
          const myClasses = data.data.classes.filter((c: any) => 
            (session?.user?.enrolledClasses || []).includes(c.classId)
          );
          setEnrolledClasses(myClasses);
        }
      } catch (e) {
        console.error("Failed to load layout classes", e);
      }
    }
    loadClasses();
  }, [session?.user?.enrolledClasses]);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-background flex flex-col hidden md:flex shadow-sm">
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <span className="text-ecu-purple drop-shadow-sm">TheCrows</span>
            <span className="text-ecu-gold drop-shadow-sm">Nest</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg shadow-sm border ${!activeClass && pathname === '/dashboard' ? 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/20' : 'text-foreground border-transparent hover:border-border hover:bg-muted/30'
              }`}
          >
            <span className="text-xl">📚</span> My Classes
          </Link>

          <Link
            href="/dashboard/study-plans"
            className={`flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg shadow-sm border ${pathname === '/dashboard/study-plans' ? 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/20' : 'text-foreground border-transparent hover:border-border hover:bg-muted/30'
              }`}
          >
            <span className="text-xl">🗺️</span> Study Plans
          </Link>

          {/* Enrolled Classes List */}
          <div className="pl-4 mt-2 space-y-2">
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
                      <Link href={`/dashboard/classes/${cls.classId}`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname === `/dashboard/classes/${cls.classId}` ? `${activeText} font-semibold bg-muted/50` : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                        Overview
                      </Link>
                      <Link href={`/dashboard/classes/${cls.classId}/study-plans`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname.includes('study-plans') ? `${activeText} font-semibold bg-muted/50` : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                        Study Plans
                      </Link>
                      <Link href={`/dashboard/classes/${cls.classId}/practice-exams`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname.includes('practice-exams') ? `${activeText} font-semibold bg-muted/50` : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                        Practice Exams
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-8 pt-4 border-t border-border/40">
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
            <div className="flex items-center gap-3 px-1.5 py-1.5 bg-background border border-border shadow-sm rounded-full cursor-pointer hover:bg-muted/50 transition-colors">
              <span className="text-sm font-semibold text-foreground pl-3 hidden sm:inline-block">{userName}</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ecu-gold to-ecu-gold/80 flex items-center justify-center text-sm font-bold text-ecu-purple shadow-inner border border-ecu-gold">
                {userInitial}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-xs text-muted-foreground hover:text-red-500 font-medium transition-colors"
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
