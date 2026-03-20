"use client"

import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">My Classes</h1>
        <p className="text-muted-foreground mt-2 text-lg">Manage your enrolled courses and access study materials.</p>
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
        {/* Mock Class 1 */}
        <Link href="/dashboard/classes/csci1010" className="block group h-full">
          <div className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col">
            <div className="h-2.5 bg-gradient-to-r from-ecu-purple to-ecu-purple/70"></div>
            <div className="p-6 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-xl group-hover:text-ecu-purple transition-colors">CSCI 1010</h3>
                <span className="px-2.5 py-1 bg-ecu-gold/20 text-ecu-purple text-xs font-bold rounded-md">Active</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed flex-1">Algorithmic Problem Solving. Introduction to problem-solving concepts and program design.</p>
              <div className="flex items-center justify-between w-full h-10 px-4 py-2 border-2 border-border/80 bg-background text-sm font-medium group-hover:bg-ecu-purple group-hover:text-primary-foreground group-hover:border-ecu-purple shadow-sm transition-all duration-300 rounded-xl">
                <span>View Materials</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          </div>
        </Link>

        {/* Mock Class 2 */}
        <Link href="/dashboard/classes/math1065" className="block group h-full">
          <div className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col">
            <div className="h-2.5 bg-gradient-to-r from-ecu-gold to-ecu-gold/70"></div>
            <div className="p-6 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-xl group-hover:text-ecu-gold transition-colors">MATH 1065</h3>
                <span className="px-2.5 py-1 bg-ecu-gold/20 text-ecu-purple text-xs font-bold rounded-md">Active</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed flex-1">College Algebra. Functions, graphs, equations, and inequalities. Essential for STEM.</p>
              <div className="flex items-center justify-between w-full h-10 px-4 py-2 border-2 border-border/80 bg-background text-sm font-medium group-hover:bg-ecu-gold group-hover:text-secondary-foreground group-hover:border-ecu-gold shadow-sm transition-all duration-300 rounded-xl">
                <span>View Materials</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
