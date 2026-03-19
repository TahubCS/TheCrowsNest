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
        <Link href={`/dashboard/classes/${classId}/study-plans`} className="bg-background rounded-2xl border border-border p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[200px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-8xl">📝</span>
          </div>
          <h3 className="font-bold text-2xl group-hover:text-ecu-purple transition-colors mb-2">Study Plans</h3>
          <p className="text-muted-foreground max-w-[80%]">Community-driven study guides and weekly planners specifically for {formattedClass}.</p>
        </Link>

        <Link href={`/dashboard/classes/${classId}/practice-exams`} className="bg-background rounded-2xl border border-border p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[200px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-8xl">🎯</span>
          </div>
          <h3 className="font-bold text-2xl group-hover:text-ecu-gold transition-colors mb-2">Practice Exams</h3>
          <p className="text-muted-foreground max-w-[80%]">Past exams, flashcards, and quizzes submitted by students who previously took {formattedClass}.</p>
        </Link>
      </div>
    </div>
  );
}
