"use client"

import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// MOCK DATA TOGGLE: 
// Leave this array empty `[]` to view the Empty State.
// Uncomment the filled array to view the Populated State.
const MOCK_ENROLLED_CLASSES: any[] = [];
/* const MOCK_ENROLLED_CLASSES = [
  { id: "csci1010", name: "CSCI 1010", title: "Algorithmic Problem Solving. Introduction to problem-solving concepts and program design.", color: "purple", students: 47 },
  { id: "math1065", name: "MATH 1065", title: "College Algebra. Functions, graphs, equations, and inequalities. Essential for STEM.", color: "gold", students: 112 }
]; */

export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">My Classes</h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage your enrolled courses and access study materials.</p>
        </div>

        <div className="shrink-0 flex items-center gap-3 bg-background border border-border p-1.5 rounded-xl shadow-sm">
          <div className="px-3 py-1.5 text-sm font-semibold text-muted-foreground hidden sm:block">Semester:</div>
          <div className="relative">
            <select className="appearance-none bg-muted text-foreground text-sm font-bold rounded-lg pl-4 pr-10 py-2 border-none focus:ring-2 focus:ring-ecu-purple cursor-pointer hover:bg-muted/80 transition-colors">
              <option>Fall 2026</option>
              <option>Spring 2026</option>
              <option>Fall 2025</option>
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="relative max-w-2xl group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-ecu-purple">
          <svg className="w-5 h-5 text-muted-foreground group-focus-within:text-ecu-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <Input
          type="search"
          placeholder="Search for classes... ex: CSCI1010"
          className="pl-12 h-14 text-base bg-background shadow-sm border-border focus-visible:border-ecu-purple focus-visible:ring-ecu-purple/20 rounded-xl transition-all"
        />
        <div className="absolute inset-y-0 right-2 flex items-center">
          <Button size="sm" className="bg-ecu-purple text-primary-foreground hover:bg-ecu-purple/90 rounded-lg h-10 px-4 font-semibold shadow-md">
            Search
          </Button>
        </div>
      </div>

      {/* Course Grid */}
      {MOCK_ENROLLED_CLASSES.length === 0 ? (
        <div className="space-y-8 mt-8">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10 shadow-sm">
            <div className="bg-muted w-24 h-24 rounded-full flex items-center justify-center mb-6 border-4 border-background shadow-sm">
              <span className="text-5xl">⚓</span>
            </div>
            <h2 className="text-2xl font-extrabold mb-3">No Classes Found</h2>
            <p className="text-muted-foreground max-w-sm mx-auto mb-8 font-medium">
              Your schedule is completely empty. Search for your current courses above to start building your AI study hub!
            </p>
            <Button className="bg-ecu-purple hover:bg-ecu-purple/90 text-primary-foreground font-bold rounded-xl shadow-lg px-8 h-12 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Find a Class
            </Button>
          </div>

          {/* Quick Add Recommendations */}
          <div className="bg-background rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-ecu-gold/20 text-ecu-purple rounded-xl shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Quick Add: Freshman CS Major</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Based on your student profile, these are commonly taken in Fall 2026.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border border-border rounded-xl p-5 hover:border-ecu-purple transition-colors group flex flex-col justify-between shadow-sm hover:shadow-md bg-muted/20 hover:bg-background">
                <div>
                  <h4 className="font-bold tracking-tight text-lg text-ecu-purple">CSCI 1010</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-6 leading-relaxed">Algorithmic Problem Solving. Introduction to program design.</p>
                </div>
                <button className="w-full py-2.5 text-xs font-bold rounded-lg border border-border group-hover:bg-ecu-purple group-hover:text-white group-hover:border-ecu-purple transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                  <span>+</span> Quick Add
                </button>
              </div>
              <div className="border border-border rounded-xl p-5 hover:border-ecu-gold transition-colors group flex flex-col justify-between shadow-sm hover:shadow-md bg-muted/20 hover:bg-background">
                <div>
                  <h4 className="font-bold tracking-tight text-lg text-ecu-gold">MATH 1065</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-6 leading-relaxed">College Algebra. Functions, equations, and inequalities.</p>
                </div>
                <button className="w-full py-2.5 text-xs font-bold rounded-lg border border-border group-hover:bg-ecu-gold group-hover:text-black group-hover:border-ecu-gold transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                  <span>+</span> Quick Add
                </button>
              </div>
              <div className="border border-border rounded-xl p-5 hover:border-border transition-colors group flex flex-col justify-between shadow-sm hover:shadow-md bg-muted/20 hover:bg-background">
                <div>
                  <h4 className="font-bold tracking-tight text-lg text-foreground">ENGL 1100</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-6 leading-relaxed">Foundations of College Writing. Essay drafting and peer review.</p>
                </div>
                <button className="w-full py-2.5 text-xs font-bold rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1.5 shadow-sm text-foreground">
                  <span>+</span> Quick Add
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {MOCK_ENROLLED_CLASSES.map((cls) => (
            <Link key={cls.id} href={`/dashboard/classes/${cls.id}`} className="block group h-full">
              <div className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col">
                <div className={`h-2.5 bg-gradient-to-r ${cls.color === 'purple' ? 'from-ecu-purple to-purple-400' : 'from-ecu-gold to-yellow-300'}`}></div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className={`font-bold text-xl transition-colors ${cls.color === 'purple' ? 'group-hover:text-ecu-purple' : 'group-hover:text-ecu-gold'}`}>{cls.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-muted-foreground">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        {cls.students} students enrolled
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-ecu-gold/20 text-ecu-purple text-xs font-bold rounded-md h-fit">Active</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed flex-1 pt-1">{cls.title}</p>
                  <div className={`flex items-center justify-between w-full h-10 px-4 py-2 border-2 border-border/80 bg-background text-sm font-medium shadow-sm transition-all duration-300 rounded-xl ${cls.color === 'purple' ? 'group-hover:bg-ecu-purple group-hover:text-primary-foreground group-hover:border-ecu-purple' : 'group-hover:bg-ecu-gold group-hover:text-secondary-foreground group-hover:border-ecu-gold'}`}>
                    <span>View Materials</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Add Class Card */}
          <div className="bg-background/50 rounded-2xl border-2 border-dashed border-border hover:border-ecu-purple hover:bg-ecu-purple/5 flex flex-col items-center justify-center p-8 text-center text-muted-foreground hover:text-ecu-purple transition-all duration-300 cursor-pointer min-h-[240px] group">
            <div className="w-14 h-14 rounded-full bg-muted group-hover:bg-ecu-purple/20 flex items-center justify-center mb-4 transition-colors">
              <span className="text-3xl font-light text-foreground group-hover:text-ecu-purple">+</span>
            </div>
            <span className="font-semibold text-lg text-foreground group-hover:text-ecu-purple">Join New Class</span>
            <p className="text-sm mt-1">Use the search bar above</p>
          </div>
        </div>
      )}
    </div>
  );
}
