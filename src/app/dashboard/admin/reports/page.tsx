export default function AdminReportsPage() {
  return (
    <div className="flex flex-col gap-8 h-full bg-background animate-in fade-in duration-300">
      <section className="bg-red-500/5 border border-red-500/10 rounded-xl shadow-sm p-6 mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-red-500 flex items-center gap-2 tracking-tight">
              <span>🚩</span> Pending Reports
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Review user-submitted reports regarding inappropriate documents or authors.
            </p>
          </div>
          <span className="bg-red-500/10 text-red-500 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-500/20">
            0 Open Cases
          </span>
        </div>
        
        <div className="flex flex-col items-center justify-center p-12 mt-4 bg-background border border-dashed border-red-500/20 hover:border-red-500/40 transition-colors rounded-lg text-center">
          <span className="text-5xl mb-4 drop-shadow-sm">✨</span>
          <h3 className="text-lg font-bold text-foreground mb-1">No reports to review</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Everything looks good! There are no filed reports for moderation at this time.
          </p>
        </div>
      </section>
    </div>
  );
}
