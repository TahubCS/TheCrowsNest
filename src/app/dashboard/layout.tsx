"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import React from 'react';
import { MOCK_ENROLLED_CLASSES as SIDEBAR_CLASSES } from "@/lib/data/mock-classes";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name || 'Student';
  const userInitial = userName.charAt(0).toUpperCase();

  // Basic logic to determine if we are in a specific class
  const classMatch = pathname.match(/\/dashboard\/classes\/([^/]+)/);
  const activeClass = classMatch ? classMatch[1] : null;

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
            className={`flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg shadow-sm border ${!activeClass ? 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/20' : 'text-foreground border-border bg-muted/20 hover:bg-muted/60 hover:border-border/80'
              }`}
          >
            <span className="text-xl">📚</span> My Classes
          </Link>

          {/* Enrolled Classes List */}
          {SIDEBAR_CLASSES.length > 0 && (
            <div className="pl-4 mt-2 space-y-2">
              {SIDEBAR_CLASSES.map((cls) => {
                const isActive = activeClass === cls.id;
                const activeWrapperClass = cls.theme === 'purple' 
                  ? 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/20 font-bold shadow-sm'
                  : 'bg-ecu-gold/10 text-ecu-gold border-ecu-gold/30 font-bold shadow-sm';
                const inactiveWrapperClass = 'text-muted-foreground border-border/40 hover:bg-muted hover:border-border/80 font-medium';
                
                const navItemActiveText = cls.theme === 'purple' ? 'text-ecu-purple' : 'text-ecu-gold';
                const navBorderActive = cls.theme === 'purple' ? 'border-ecu-purple/20' : 'border-ecu-gold/30';
                
                return (
                  <div key={cls.id}>
                    <Link 
                      href={`/dashboard/classes/${cls.id}`} 
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors border ${
                        isActive ? activeWrapperClass : inactiveWrapperClass
                      }`}
                    >
                      <span className="w-5 text-center">{cls.icon}</span> {cls.name}
                    </Link>
                    
                    {isActive && (
                      <div className={`pl-6 mt-1.5 space-y-1 border-l-2 ml-4 mb-2 ${navBorderActive}`}>
                        <Link href={`/dashboard/classes/${cls.id}`} className={`block px-3 py-1.5 text-xs rounded-md transition-colors ${pathname === `/dashboard/classes/${cls.id}` ? `${navItemActiveText} font-semibold bg-muted/50` : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                          Overview
                        </Link>
                        <Link href={`/dashboard/classes/${cls.id}/study-plans`} className={`block px-3 py-1.5 text-xs rounded-md transition-colors ${pathname.includes('study-plans') ? `${navItemActiveText} font-semibold bg-muted/50` : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                          Study Plans
                        </Link>
                        <Link href={`/dashboard/classes/${cls.id}/practice-exams`} className={`block px-3 py-1.5 text-xs rounded-md transition-colors ${pathname.includes('practice-exams') ? `${navItemActiveText} font-semibold bg-muted/50` : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                          Practice Exams
                        </Link>
                      </div>
                    )}
                   </div>
                );
              })}
            </div>
          )}
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
