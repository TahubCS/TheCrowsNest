"use client";

import { useState, useEffect } from "react";

interface ClassRequest {
  requestId: string;
  courseCode: string;
  courseName: string;
  department: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote?: string;
  userEmail: string;
  userName?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<ClassRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/admin/requests");
      const json = await res.json();
      if (json.success) {
        setRequests(json.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: "APPROVED" | "REJECTED") => {
    setActionLoading(requestId);
    try {
      const res = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: action }),
      });
      const json = await res.json();
      if (json.success) {
        setRequests(prev =>
          prev.map(r => r.requestId === requestId ? { ...r, status: action, updatedAt: new Date().toISOString() } : r)
        );
      }
    } catch (error) {
      console.error("Failed to update request:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "PENDING");
  const resolvedRequests = requests.filter(r => r.status !== "PENDING");

  return (
    <div className="flex flex-col gap-8 h-full bg-background animate-in fade-in duration-300">
      {/* Pending Class Requests */}
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
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            pendingRequests.length > 0 
              ? "bg-ecu-gold/20 text-ecu-purple border-ecu-gold/30" 
              : "bg-muted text-muted-foreground border-border"
          }`}>
            {pendingRequests.length} Pending
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground animate-pulse">
            Loading requests...
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 mt-4 bg-background border border-dashed border-border/70 hover:border-border transition-colors rounded-lg text-center">
            <span className="text-5xl mb-4 drop-shadow-sm">🙌</span>
            <h3 className="text-lg font-bold text-foreground mb-1">You're all caught up!</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              There are no pending class creation requests at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {pendingRequests.map((req) => (
              <div
                key={req.requestId}
                className="flex items-center justify-between bg-background border border-border/60 rounded-lg p-4 hover:border-ecu-purple/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-foreground">{req.courseCode}</span>
                    <span className="text-muted-foreground text-sm">—</span>
                    <span className="text-sm text-foreground">{req.courseName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>📂 {req.department}</span>
                    <span>👤 {req.userName || req.userEmail}</span>
                    <span>📅 {new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleAction(req.requestId, "APPROVED")}
                    disabled={actionLoading === req.requestId}
                    className="px-4 py-2 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === req.requestId ? "..." : "✓ Approve"}
                  </button>
                  <button
                    onClick={() => handleAction(req.requestId, "REJECTED")}
                    disabled={actionLoading === req.requestId}
                    className="px-4 py-2 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === req.requestId ? "..." : "✕ Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resolved Requests */}
      {resolvedRequests.length > 0 && (
        <section className="bg-muted/10 border border-border/50 rounded-xl shadow-sm p-6 mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight">
              <span>📋</span> Resolved Requests
            </h2>
            <p className="text-muted-foreground text-xs mt-1">
              Previously reviewed class requests.
            </p>
          </div>
          <div className="space-y-2 mt-4">
            {resolvedRequests.map((req) => (
              <div
                key={req.requestId}
                className="flex items-center justify-between bg-background/50 border border-border/40 rounded-lg px-4 py-3 opacity-70"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    req.status === "APPROVED"
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-red-100 text-red-600 border border-red-200"
                  }`}>
                    {req.status}
                  </span>
                  <span className="font-semibold text-sm text-foreground">{req.courseCode}</span>
                  <span className="text-sm text-muted-foreground">{req.courseName}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {req.updatedAt ? new Date(req.updatedAt).toLocaleDateString() : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
