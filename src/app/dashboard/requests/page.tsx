"use client";

import { useState, useEffect } from "react";

interface ClassRequest {
  id: string;
  courseCode: string;
  courseName: string;
  department: string;
  status: string;
  createdAt: string;
}

export default function PendingRequestsPage() {
  const [classRequests, setClassRequests] = useState<ClassRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/requests")
      .then(res => res.json())
      .then(data => {
         if (data.success) {
           setClassRequests(data.data);
         }
         setLoading(false);
      })
      .catch(err => {
         console.error(err);
         setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Pending Requests</h1>
          <p className="text-muted-foreground mt-2 text-lg">Track the status of your requested classes and document uploads.</p>
        </div>
      </div>

      <div className="space-y-8">
        <section className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span>🏫</span> Class Creation Requests
            </h2>
            <span className="bg-ecu-purple/10 text-ecu-purple px-2.5 py-1 rounded-full text-xs font-bold border border-ecu-purple/20">
              {classRequests.length} / 6 Pending
            </span>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ecu-purple"></div>
              </div>
            ) : classRequests.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl bg-muted/5">
                <span className="text-4xl hover:-translate-y-1 transition-transform inline-block mb-2">✈️</span>
                <h3 className="text-lg font-bold mt-2">No pending classes</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">You haven't requested any new classes. If you can't find a class you are looking for, use the search page to request it!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {classRequests.map((req) => (
                  <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors gap-4">
                    <div>
                      <h4 className="font-bold text-foreground text-lg">{req.courseCode}</h4>
                      <p className="text-sm font-medium">{req.courseName}</p>
                      <p className="text-xs text-muted-foreground mt-1">Requested {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-4">
                      <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded-lg text-xs font-bold flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                        </span>
                        IN REVIEW
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span>📄</span> Document Upload Requests
            </h2>
            <span className="bg-muted text-muted-foreground px-2.5 py-1 rounded-full text-xs font-bold border border-border">
              0 / 12 Pending
            </span>
          </div>
          
          <div className="p-6">
            <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl bg-muted/5">
              <span className="text-4xl hover:-translate-y-1 transition-transform inline-block mb-2">📭</span>
              <h3 className="text-lg font-bold mt-2">All documents processed</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Any study materials you've uploaded have either been fully approved or you have none waiting for review.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
