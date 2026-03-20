"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Basic logic to determine if we are in a specific class
  const classMatch = pathname.match(/\/dashboard\/classes\/([^/]+)/);
  const activeClass = classMatch ? classMatch[1] : null;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      {/* Sidebar */}
      <aside className="w-64 h-full border-r border-border bg-background flex flex-col hidden md:flex shadow-sm shrink-0">
        <div className="p-6 border-b border-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <span className="text-ecu-purple drop-shadow-sm">Pirate</span>
            <span className="text-ecu-gold drop-shadow-sm">Study</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
          <Link 
            href="/dashboard" 
            className={`flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg shadow-sm border ${
              !activeClass ? 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/20' : 'text-foreground border-border bg-muted/20 hover:bg-muted/60 hover:border-border/80'
            }`}
          >
            <span className="text-xl">📚</span> My Classes
          </Link>
          
          {/* Enrolled Classes List */}
          <div className="pl-4 mt-2 space-y-2">
            
            {/* Class: CSCI 1010 */}
            <div>
              <Link href="/dashboard/classes/csci1010" className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors border ${activeClass === 'csci1010' ? 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/20 font-bold shadow-sm' : 'text-muted-foreground border-border/40 hover:bg-muted hover:border-border/80 font-medium'}`}>
                <span>💻</span> CSCI 1010
              </Link>
              {activeClass === 'csci1010' && (
                <div className="pl-6 mt-1.5 space-y-1 border-l-2 border-ecu-purple/20 ml-4 mb-2">
                  <Link href={`/dashboard/classes/csci1010`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname === '/dashboard/classes/csci1010' ? 'text-ecu-purple font-semibold bg-muted/50' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                    Overview
                  </Link>
                  <Link href={`/dashboard/classes/csci1010/study-plans`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname.includes('study-plans') ? 'text-ecu-purple font-semibold bg-muted/50' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                    Study Plans
                  </Link>
                  <Link href={`/dashboard/classes/csci1010/practice-exams`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname.includes('practice-exams') ? 'text-ecu-purple font-semibold bg-muted/50' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                    Practice Exams
                  </Link>
                </div>
              )}
            </div>

            {/* Class: MATH 1065 */}
            <div>
              <Link href="/dashboard/classes/math1065" className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors border ${activeClass === 'math1065' ? 'bg-ecu-gold/10 text-ecu-gold border-ecu-gold/30 font-bold shadow-sm' : 'text-muted-foreground border-border/40 hover:bg-muted hover:border-border/80 font-medium'}`}>
                <span>📐</span> MATH 1065
              </Link>
              {activeClass === 'math1065' && (
                <div className="pl-6 mt-1.5 space-y-1 border-l-2 border-ecu-gold/30 ml-4 mb-2">
                  <Link href={`/dashboard/classes/math1065`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname === '/dashboard/classes/math1065' ? 'text-ecu-gold font-semibold bg-muted/50' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                    Overview
                  </Link>
                  <Link href={`/dashboard/classes/math1065/study-plans`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname.includes('study-plans') ? 'text-ecu-gold font-semibold bg-muted/50' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                    Study Plans
                  </Link>
                  <Link href={`/dashboard/classes/math1065/practice-exams`} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${pathname.includes('practice-exams') ? 'text-ecu-gold font-semibold bg-muted/50' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                    Practice Exams
                  </Link>
                </div>
              )}
            </div>
            
          </div>
        </nav>
        <div className="p-6 border-t border-border shrink-0 text-xs text-muted-foreground font-medium">
          PirateStudy © {new Date().getFullYear()}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Topbar */}
        <header className="h-16 shrink-0 border-b border-border bg-background/80 backdrop-blur-lg flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center md:hidden">
            <span className="font-bold text-lg tracking-tight">
              <span className="text-ecu-purple">Pirate</span>
              <span className="text-ecu-gold">Study</span>
            </span>
          </div>
          <div className="flex-1"></div> {/* Spacer */}
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-1.5 py-1.5 bg-background border border-border shadow-sm rounded-full cursor-pointer hover:bg-muted/50 transition-colors">
              <span className="text-sm font-semibold text-foreground pl-3 hidden sm:inline-block">Jacob (Student)</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ecu-gold to-ecu-gold/80 flex items-center justify-center text-sm font-bold text-ecu-purple shadow-inner border border-ecu-gold">
                J
              </div>
            </div>
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
