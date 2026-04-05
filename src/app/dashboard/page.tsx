"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface EnrolledClass {
  classId: string;
  courseCode: string;
  courseName: string;
  creditHours: number;
  enrolledCount: number;
  department: string;
  description: string;
}

export default function DashboardPage() {
  const { data: session, update } = useSession();
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EnrolledClass[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Class Request State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestForm, setRequestForm] = useState({ courseCode: "", courseName: "", department: "" });
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Enrollment State
  const [enrollingMap, setEnrollingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadClasses() {
      try {
        // Fetch enrolled class IDs directly from DB (bypasses stale JWT)
        const [classesRes, enrolledRes, requestsRes] = await Promise.all([
          fetch("/api/classes"),
          fetch("/api/user/enrolled"),
          fetch("/api/requests"),
        ]);
        if (classesRes.ok && enrolledRes.ok) {
          const classesData = await classesRes.json();
          const enrolledData = await enrolledRes.json();
          const freshEnrolledIds: string[] = enrolledData.data?.enrolledClasses || [];
          setEnrolledIds(freshEnrolledIds);
          const myClasses = classesData.data.classes.filter((c: { classId: string }) =>
            freshEnrolledIds.includes(c.classId)
          );
          setClasses(myClasses);
        }
        if (requestsRes && requestsRes.ok) {
          const requestsData = await requestsRes.json();
          setPendingRequestsCount(requestsData.data?.length || 0);
        }
      } catch (e) {
        console.error("Failed to load classes", e);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user) {
      loadClasses();
    }
  }, [session]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/classes?search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data.classes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEnroll = async (classId: string) => {
    setEnrollingMap(prev => ({ ...prev, [classId]: true }));
    try {
      const res = await fetch("/api/classes/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId })
      });
      const data = await res.json();
      if (data.success) {
        await update();
        // Full page reload to bypass SSR cache and show updated classes
        window.location.reload();
      } else {
        toast.error(`Failed to enroll: ${data.message}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to enroll in class.");
    } finally {
      setEnrollingMap(prev => ({ ...prev, [classId]: false }));
    }
  };

  const isEnrolled = (classId: string) => {
    return enrolledIds.includes(classId);
  };

  const handleRequestClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRequesting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowRequestModal(false);
        setRequestForm({ courseCode: "", courseName: "", department: "" });
        setPendingRequestsCount(prev => prev + 1);
        toast.success("Class request submitted successfully! You can track it in the Pending Requests tab.");
      } else {
        toast.error("Failed to submit request: " + data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error submitting request.");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">My Classes</h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage your enrolled courses and access study materials.</p>
        </div>
      </div>

      {/* Search Section */}
      <form onSubmit={handleSearch} className="relative max-w-2xl group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-ecu-purple">
          <svg className="w-5 h-5 text-muted-foreground group-focus-within:text-ecu-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for classes... ex: CSCI1010"
          className="pl-12 h-14 text-base bg-background shadow-sm border-border focus-visible:border-ecu-purple focus-visible:ring-ecu-purple/20 rounded-xl transition-all"
        />
        <div className="absolute inset-y-0 right-2 flex items-center">
          <Button type="submit" disabled={isSearching} size="sm" className="bg-ecu-purple text-primary-foreground hover:bg-ecu-purple/90 rounded-lg h-10 px-4 font-semibold shadow-md disabled:opacity-50">
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>

      {/* Primary Dashboard View Logic */}
      {hasSearched ? (
        <div className="space-y-6 mt-8">
          <h2 className="text-2xl font-bold">Search Results</h2>
          {isSearching ? (
            <div className="flex items-center gap-3 text-muted-foreground"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-ecu-purple"></div> Searching...</div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-xl bg-muted/20 text-center">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-muted-foreground font-medium mb-4">{`No classes found matching "${searchQuery}".`}</p>
              <div className="flex flex-col items-center gap-2">
                <Button disabled={pendingRequestsCount >= 6} onClick={() => setShowRequestModal(true)} variant="outline" className="border-ecu-purple text-ecu-purple hover:bg-ecu-purple/10">
                  Can&apos;t find your class? Request it to be added
                </Button>
                <span className="text-xs font-semibold text-ecu-purple bg-ecu-purple/10 px-2 py-1 rounded-md">
                  {Math.max(0, 6 - pendingRequestsCount)}/6 Requests Remaining
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {searchResults.map((cls) => (
                <div key={cls.classId} className="bg-background rounded-xl border border-border p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-lg text-ecu-purple">{cls.courseCode}</h4>
                      <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">{cls.creditHours} Credits</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-1">{cls.courseName}</p>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{cls.description}</p>
                  </div>
                  <div className="mt-5">
                    {isEnrolled(cls.classId) ? (
                      <Button disabled variant="outline" className="w-full font-bold border-dashed border-2">Already Enrolled</Button>
                    ) : (
                      <Button onClick={() => handleEnroll(cls.classId)} disabled={enrollingMap[cls.classId]} className="w-full bg-ecu-gold hover:bg-ecu-gold/90 text-secondary-foreground font-bold shadow-sm">
                        {enrollingMap[cls.classId] ? "Enrolling..." : "+ Enroll in Class"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              </div>
              
              {/* Request Class Banner below results */}
              <div className="bg-ecu-purple/5 border border-ecu-purple/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm mt-4">
                <div>
                  <h4 className="font-bold text-ecu-purple text-lg">Didn&apos;t see what you&apos;re looking for?</h4>
                  <p className="text-sm text-muted-foreground mt-1">Help us expand TheCrowsNest by requesting a new class.</p>
                </div>
                <div className="flex flex-col items-center sm:items-end gap-1 shrink-0">
                  <Button disabled={pendingRequestsCount >= 6} onClick={() => setShowRequestModal(true)} className="bg-ecu-purple text-white hover:bg-ecu-purple/90 w-full sm:w-auto">
                    Request a Class
                  </Button>
                  <span className="text-xs font-semibold text-ecu-purple bg-ecu-purple/10 px-2 py-1 rounded-md">
                    {Math.max(0, 6 - pendingRequestsCount)}/6 Requests Remaining
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ecu-purple"></div>
        </div>
      ) : classes.length === 0 ? (
        <div className="space-y-8 mt-8">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10 shadow-sm">
            <div className="bg-muted w-24 h-24 rounded-full flex items-center justify-center mb-6 border-4 border-background shadow-sm">
              <span className="text-5xl">⚓</span>
            </div>
            <h2 className="text-2xl font-extrabold mb-3">No Classes Found</h2>
            <p className="text-muted-foreground max-w-sm mx-auto mb-8 font-medium">
              Your schedule is completely empty. Search for your current courses above to start building your AI study hub!
            </p>
            <Button onClick={() => {
              const input = document.querySelector('input[type="search"]') as HTMLInputElement;
              if (input) input.focus();
            }} className="bg-ecu-purple hover:bg-ecu-purple/90 text-primary-foreground font-bold rounded-xl shadow-lg px-8 h-12 flex items-center gap-2">
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
                <h3 className="font-bold text-lg text-foreground">Quick Add Recommendations</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Based on your student profile, these are commonly taken in Fall 2026.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border border-border rounded-xl p-5 hover:border-ecu-purple transition-colors group flex flex-col justify-between shadow-sm hover:shadow-md bg-muted/20 hover:bg-background">
                <div>
                  <h4 className="font-bold tracking-tight text-lg text-ecu-purple">CSCI 1010</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-6 leading-relaxed">Algorithmic Problem Solving. Introduction to program design.</p>
                </div>
                <button disabled={enrollingMap["csci1010"] || isEnrolled("csci1010")} onClick={() => handleEnroll("csci1010")} className="w-full py-2.5 text-xs font-bold rounded-lg border border-border group-hover:bg-ecu-purple group-hover:text-white group-hover:border-ecu-purple transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  <span>{isEnrolled("csci1010") ? "✓" : "+"}</span> {isEnrolled("csci1010") ? "Enrolled" : enrollingMap["csci1010"] ? "Enrolling..." : "Quick Add"}
                </button>
              </div>
              <div className="border border-border rounded-xl p-5 hover:border-ecu-gold transition-colors group flex flex-col justify-between shadow-sm hover:shadow-md bg-muted/20 hover:bg-background">
                <div>
                  <h4 className="font-bold tracking-tight text-lg text-ecu-gold">MATH 1065</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-6 leading-relaxed">College Algebra. Functions, equations, and inequalities.</p>
                </div>
                <button disabled={enrollingMap["math1065"] || isEnrolled("math1065")} onClick={() => handleEnroll("math1065")} className="w-full py-2.5 text-xs font-bold rounded-lg border border-border group-hover:bg-ecu-gold group-hover:text-black group-hover:border-ecu-gold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  <span>{isEnrolled("math1065") ? "✓" : "+"}</span> {isEnrolled("math1065") ? "Enrolled" : enrollingMap["math1065"] ? "Enrolling..." : "Quick Add"}
                </button>
              </div>
              <div className="border border-border rounded-xl p-5 hover:border-border transition-colors group flex flex-col justify-between shadow-sm hover:shadow-md bg-muted/20 hover:bg-background">
                <div>
                  <h4 className="font-bold tracking-tight text-lg text-foreground">ENGL 1100</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-6 leading-relaxed">Foundations of College Writing. Essay drafting and peer review.</p>
                </div>
                <button disabled={enrollingMap["engl1100"] || isEnrolled("engl1100")} onClick={() => handleEnroll("engl1100")} className="w-full py-2.5 text-xs font-bold rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1.5 shadow-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed">
                  <span>{isEnrolled("engl1100") ? "✓" : "+"}</span> {isEnrolled("engl1100") ? "Enrolled" : enrollingMap["engl1100"] ? "Enrolling..." : "Quick Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {classes.map((cls, idx) => {
            const isPurple = idx % 2 === 0;
            return (
              <Link key={cls.classId} href={`/dashboard/classes/${cls.classId}`} className="block group h-full">
                <div className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col">
                  <div className={`h-2.5 bg-linear-to-r ${isPurple ? 'from-ecu-purple to-purple-400' : 'from-ecu-gold to-yellow-300'}`}></div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`font-bold text-xl transition-colors ${isPurple ? 'group-hover:text-ecu-purple' : 'group-hover:text-ecu-gold'}`}>{cls.courseCode}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-muted-foreground">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          {cls.enrolledCount || 0} students enrolled
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-ecu-gold/20 text-ecu-purple text-xs font-bold rounded-md h-fit">Active</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed flex-1 pt-1">{cls.courseName}</p>
                    <div className={`flex items-center justify-between w-full h-10 px-4 py-2 border-2 border-border/80 bg-background text-sm font-medium shadow-sm transition-all duration-300 rounded-xl ${isPurple ? 'group-hover:bg-ecu-purple group-hover:text-primary-foreground group-hover:border-ecu-purple' : 'group-hover:bg-ecu-gold group-hover:text-secondary-foreground group-hover:border-ecu-gold'}`}>
                      <span>View Materials</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Add Class Card */}
          <div onClick={() => {
            const input = document.querySelector('input[type="search"]') as HTMLInputElement;
            if (input) input.focus();
          }} className="bg-background/50 rounded-2xl border-2 border-dashed border-border hover:border-ecu-purple hover:bg-ecu-purple/5 flex flex-col items-center justify-center p-8 text-center text-muted-foreground hover:text-ecu-purple transition-all duration-300 cursor-pointer min-h-60 group">
            <div className="w-14 h-14 rounded-full bg-muted group-hover:bg-ecu-purple/20 flex items-center justify-center mb-4 transition-colors">
              <span className="text-3xl font-light text-foreground group-hover:text-ecu-purple">+</span>
            </div>
            <span className="font-semibold text-lg text-foreground group-hover:text-ecu-purple">Join New Class</span>
            <p className="text-sm mt-1">Use the search bar above</p>
          </div>
        </div>
      )}

      {/* Class Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl border border-border p-6 max-w-md w-full shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-xl font-bold mb-2">Request New Class</h3>
            <p className="text-sm text-muted-foreground mb-6">Enter the details of the class you want added to the platform. An admin will review it shortly.</p>
            
            <form onSubmit={handleRequestClass} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Course Code</label>
                <Input 
                  required 
                  placeholder="e.g. MATH1065" 
                  value={requestForm.courseCode}
                  onChange={e => setRequestForm({...requestForm, courseCode: e.target.value})}
                  className="bg-muted/30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Course Name</label>
                <Input 
                  required 
                  placeholder="e.g. College Algebra" 
                  value={requestForm.courseName}
                  onChange={e => setRequestForm({...requestForm, courseName: e.target.value})}
                  className="bg-muted/30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Department</label>
                <Input 
                  required 
                  placeholder="e.g. Mathematics" 
                  value={requestForm.department}
                  onChange={e => setRequestForm({...requestForm, department: e.target.value})}
                  className="bg-muted/30"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowRequestModal(false)} disabled={isRequesting} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={isRequesting} className="flex-1 bg-ecu-purple text-white hover:bg-ecu-purple/90">
                  {isRequesting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
