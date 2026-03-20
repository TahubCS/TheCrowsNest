import Link from 'next/link';

export default async function ClassOverviewPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const formattedClass = classId.toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-ecu-purple inline-flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{formattedClass}</h1>
        <p className="text-muted-foreground mt-2 text-lg">Class overview and study materials.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <Link href={`/dashboard/classes/${classId}/study-plans`} className="bg-background rounded-2xl border border-border p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl sm:text-8xl">📝</span>
          </div>
          <h3 className="font-bold text-xl sm:text-2xl group-hover:text-purple-400 transition-colors mb-2">Study Plans</h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-[80%]">Community-driven weekly planners for {formattedClass}.</p>
        </Link>

        <Link href={`/dashboard/classes/${classId}/practice-exams`} className="bg-background rounded-2xl border border-border p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl sm:text-8xl">🎯</span>
          </div>
          <h3 className="font-bold text-xl sm:text-2xl group-hover:text-ecu-gold transition-colors mb-2">Practice Exams</h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-[80%]">Past exams and quizzes submitted by old students.</p>
        </Link>
        
        <Link href={`/dashboard/classes/${classId}/flashcards`} className="bg-background rounded-2xl border border-border p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl sm:text-8xl">🗂️</span>
          </div>
          <h3 className="font-bold text-xl sm:text-2xl group-hover:text-green-400 transition-colors mb-2">Flashcards</h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-[80%]">Quick memorization decks tailored to your focus units.</p>
        </Link>

        <Link href={`/dashboard/classes/${classId}/ai-tutor`} className="bg-background rounded-2xl border border-border p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl sm:text-8xl">🤖</span>
          </div>
          <h3 className="font-bold text-xl sm:text-2xl group-hover:text-blue-400 transition-colors mb-2">AI Study Tutor</h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-[80%]">Get instant, step-by-step guidance on {formattedClass} topics.</p>
        </Link>
      </div>

      {/* Course Timeline & Syllabus tracker */}
      <div className="mt-12 sm:mt-16 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Course Timeline</h2>
          <span className="inline-block text-sm px-4 py-1.5 bg-ecu-gold/10 border border-ecu-gold/30 text-purple-400 rounded-full font-bold shadow-sm whitespace-nowrap text-center">
            Select topics to focus AI study tools
          </span>
        </div>

        <div className="bg-background rounded-2xl border border-border p-6 shadow-sm">
          <div className="relative border-l-2 border-muted ml-3 space-y-8 py-2">
            
            {/* Unit 1 */}
            <div className="relative pl-8">
              <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-purple-500/80 ring-4 ring-background"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Unit 1: Introduction & Fundamentals</h3>
                  <p className="text-sm text-muted-foreground mt-1">Variables, memory allocation, and basic logic loops. Chapters 1-3.</p>
                </div>
                <label className="cursor-pointer shrink-0 group/checkbox">
                  <input type="checkbox" className="peer sr-only" defaultChecked />
                  <div className="text-xs font-semibold px-4 py-2 rounded-lg border border-border text-muted-foreground group-hover/checkbox:bg-muted peer-checked:border-purple-400 peer-checked:text-purple-400 peer-checked:bg-purple-400/10 transition-all flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse hidden peer-checked:block"></div>
                    <span className="block peer-checked:hidden text-muted-foreground group-hover/checkbox:text-foreground transition-colors">Focus AI on this</span>
                    <span className="hidden peer-checked:block">Currently Focusing</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Unit 2 */}
            <div className="relative pl-8">
              <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-muted border-2 border-border ring-4 ring-background transition-colors peer-checked:bg-purple-500/80"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Unit 2: Advanced Data Structures</h3>
                  <p className="text-sm text-muted-foreground mt-1">Hash maps, linked lists, and tree traversal algorithms.</p>
                </div>
                <label className="cursor-pointer shrink-0 group/checkbox">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="text-xs font-semibold px-4 py-2 rounded-lg border border-border text-muted-foreground group-hover/checkbox:bg-muted peer-checked:border-purple-400 peer-checked:text-purple-400 peer-checked:bg-purple-400/10 transition-all flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse hidden peer-checked:block"></div>
                    <span className="block peer-checked:hidden text-muted-foreground group-hover/checkbox:text-foreground transition-colors">Focus AI on this</span>
                    <span className="hidden peer-checked:block">Currently Focusing</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Unit 3 */}
            <div className="relative pl-8">
              <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-muted border-2 border-border ring-4 ring-background transition-colors peer-checked:bg-purple-500/80"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Unit 3: Object-Oriented Design</h3>
                  <p className="text-sm text-muted-foreground mt-1">Polymorphism, inheritance, and clean architectural principles.</p>
                </div>
                <label className="cursor-pointer shrink-0 group/checkbox">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="text-xs font-semibold px-4 py-2 rounded-lg border border-border text-muted-foreground group-hover/checkbox:bg-muted peer-checked:border-purple-400 peer-checked:text-purple-400 peer-checked:bg-purple-400/10 transition-all flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse hidden peer-checked:block"></div>
                    <span className="block peer-checked:hidden text-muted-foreground group-hover/checkbox:text-foreground transition-colors">Focus AI on this</span>
                    <span className="hidden peer-checked:block">Currently Focusing</span>
                  </div>
                </label>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Uploaded Course Materials */}
      <div className="mt-16 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Course Materials</h2>
          <button className="text-sm bg-ecu-purple/10 text-ecu-purple hover:bg-ecu-purple/20 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Upload File
          </button>
        </div>

        <div className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-6 md:col-span-5">File Name</div>
            <div className="col-span-3 md:col-span-2 hidden md:block">Type</div>
            <div className="col-span-4 md:col-span-3">Uploaded By</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          
          <div className="divide-y divide-border">
            {/* Mock Syllabus */}
            <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors group">
              <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded shrink-0 bg-red-100 flex items-center justify-center text-red-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /></svg>
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-foreground truncate">{formattedClass}_Syllabus_Fall.pdf</p>
                  <p className="text-xs text-muted-foreground">Updated 2 days ago</p>
                </div>
              </div>
              <div className="col-span-3 md:col-span-2 hidden md:block text-sm text-foreground">Syllabus</div>
              <div className="col-span-4 md:col-span-3 text-sm flex items-center gap-2">
                <div className="w-6 h-6 rounded-full shrink-0 bg-ecu-gold text-[10px] flex items-center justify-center text-ecu-purple font-bold">P</div>
                <span className="truncate">Professor</span>
              </div>
              <div className="col-span-2 text-right">
                <button className="text-ecu-purple hover:underline text-sm font-medium">View</button>
              </div>
            </div>

            {/* Mock Lecture Slides */}
            <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors group">
              <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded shrink-0 bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /></svg>
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-foreground truncate">Chapter_1_Introduction.pptx</p>
                  <p className="text-xs text-muted-foreground">Updated 1 week ago</p>
                </div>
              </div>
              <div className="col-span-3 md:col-span-2 hidden md:block text-sm text-foreground">Lecture Slides</div>
              <div className="col-span-4 md:col-span-3 text-sm flex items-center gap-2">
                <div className="w-6 h-6 rounded-full shrink-0 bg-muted flex items-center justify-center text-[10px] font-bold">J</div>
                <span className="truncate">Jacob (Student)</span>
              </div>
              <div className="col-span-2 text-right">
                <button className="text-ecu-purple hover:underline text-sm font-medium">View</button>
              </div>
            </div>

            {/* Mock Study Guide */}
            <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors group">
              <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded shrink-0 bg-green-100 flex items-center justify-center text-green-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /></svg>
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-foreground truncate">Midterm_1_Comprehensive_Review.docx</p>
                  <p className="text-xs text-muted-foreground">Updated 3 weeks ago</p>
                </div>
              </div>
              <div className="col-span-3 md:col-span-2 hidden md:block text-sm text-foreground">Study Guide</div>
              <div className="col-span-4 md:col-span-3 text-sm flex items-center gap-2">
                <div className="w-6 h-6 rounded-full shrink-0 bg-ecu-purple text-white flex items-center justify-center text-[10px] font-bold">A</div>
                <span className="truncate">Alex (Student)</span>
              </div>
              <div className="col-span-2 text-right">
                <button className="text-ecu-purple hover:underline text-sm font-medium">View</button>
              </div>
            </div>
            
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          *These materials are processed by our AI to automatically generate personalized flashcards and exams for you.
        </p>
      </div>
    </div>
  );
}
