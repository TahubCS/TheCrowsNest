export default function AdminRequestsPage() {
  return (
    <div className="flex flex-col gap-8 h-full bg-background animate-in fade-in duration-300">
      {/* Class Creation Requests */}
      <section className="bg-muted/10 border border-border/50 rounded-xl shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 tracking-tight">
              <span>🏫</span> Class Creation Requests
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Review and approve requests for new classes to be added to the platform.
            </p>
          </div>
          <span className="bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full border border-border">
            0 Pending
          </span>
        </div>
        
        <div className="flex flex-col items-center justify-center p-12 mt-4 bg-background border border-dashed border-border/70 hover:border-border transition-colors rounded-lg text-center">
          <span className="text-5xl mb-4 drop-shadow-sm">🙌</span>
          <h3 className="text-lg font-bold text-foreground mb-1">You're all caught up!</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            There are no pending class creation requests at this time. Return later when users submit new requests.
          </p>
        </div>
      </section>

      {/* Document Upload Requests */}
      <section className="bg-muted/10 border border-border/50 rounded-xl shadow-sm p-6 mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 tracking-tight">
              <span>📄</span> Document Upload Requests
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Review and approve user-submitted study materials before they are published.
            </p>
          </div>
          <span className="bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full border border-border">
            0 Pending
          </span>
        </div>
        
        <div className="flex flex-col items-center justify-center p-12 mt-4 bg-background border border-dashed border-border/70 hover:border-border transition-colors rounded-lg text-center">
          <span className="text-5xl mb-4 drop-shadow-sm">📭</span>
          <h3 className="text-lg font-bold text-foreground mb-1">Inbox Zero</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            There are no pending document uploads waiting for review at the moment.
          </p>
        </div>
      </section>
    </div>
  );
}
