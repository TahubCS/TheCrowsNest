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
    <div className="flex min-h-screen bg-muted/40">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-background flex flex-col hidden md:flex shadow-sm">
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <span className="text-ecu-purple drop-shadow-sm">Pirate</span>
            <span className="text-ecu-gold drop-shadow-sm">Study</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link 
            href="/dashboard" 
            className={`flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg shadow-sm border ${
              !activeClass ? 'bg-ecu-purple/10 text-ecu-purple border-ecu-purple/10' : 'text-foreground border-transparent hover:bg-muted'
            }`}
          >
            <span className="text-xl">📚</span> My Classes
          </Link>
          
          {/* Active Class Hierarchy Options */}
          {activeClass && (
            <div className="pl-6 mt-2 space-y-1">
              <div className="px-3 py-1.5 text-sm font-bold text-foreground">
                {activeClass.toUpperCase()}
              </div>
              <Link href={`/dashboard/classes/${activeClass}`} className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${pathname === `/dashboard/classes/${activeClass}` ? 'bg-muted text-ecu-purple font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <span>🏠</span> Overview
              </Link>
              <Link href={`/dashboard/classes/${activeClass}/study-plans`} className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${pathname.includes('study-plans') ? 'bg-muted text-ecu-purple font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <span>📝</span> Study Plans
              </Link>
              <Link href={`/dashboard/classes/${activeClass}/practice-exams`} className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${pathname.includes('practice-exams') ? 'bg-muted text-ecu-purple font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <span>🎯</span> Practice Exams
              </Link>
            </div>
          )}
        </nav>
        <div className="p-6 border-t border-border text-xs text-muted-foreground font-medium">
          PirateStudy © {new Date().getFullYear()}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-lg flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
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
