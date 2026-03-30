"use client";

import { useState, useEffect } from "react";

interface Report {
  reportId: string;
  type: "USER" | "DOCUMENT";
  targetId: string;
  targetName: string;
  classId?: string;
  reason: string;
  details?: string;
  status: "OPEN" | "REVIEWED" | "DISMISSED";
  reportedBy: string;
  reportedByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/admin/reports");
      const json = await res.json();
      if (json.success) {
        setReports(json.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (reportId: string, action: "REVIEWED" | "DISMISSED") => {
    setActionLoading(reportId);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status: action }),
      });
      const json = await res.json();
      if (json.success) {
        setReports(prev =>
          prev.map(r => r.reportId === reportId ? { ...r, status: action, updatedAt: new Date().toISOString() } : r)
        );
      }
    } catch (error) {
      console.error("Failed to update report:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const openReports = reports.filter(r => r.status === "OPEN");
  const resolvedReports = reports.filter(r => r.status !== "OPEN");

  return (
    <div className="flex flex-col gap-8 h-full bg-background animate-in fade-in duration-300">
      {/* Open Reports */}
      <section className="bg-red-500/5 border border-red-500/10 rounded-xl shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-red-500 flex items-center gap-2 tracking-tight">
              <span>🚩</span> Pending Reports
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Review user-submitted reports regarding inappropriate documents or authors.
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            openReports.length > 0
              ? "bg-red-500/10 text-red-500 border-red-500/20"
              : "bg-muted text-muted-foreground border-border"
          }`}>
            {openReports.length} Open Cases
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground animate-pulse">
            Loading reports...
          </div>
        ) : openReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 mt-4 bg-background border border-dashed border-red-500/20 hover:border-red-500/40 transition-colors rounded-lg text-center">
            <span className="text-5xl mb-4 drop-shadow-sm">✨</span>
            <h3 className="text-lg font-bold text-foreground mb-1">No reports to review</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Everything looks good! There are no filed reports for moderation at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {openReports.map((report) => (
              <div
                key={report.reportId}
                className="flex items-start justify-between bg-background border border-border/60 rounded-lg p-4 hover:border-red-400/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      report.type === "USER"
                        ? "bg-orange-100 text-orange-700 border border-orange-200"
                        : "bg-blue-100 text-blue-700 border border-blue-200"
                    }`}>
                      {report.type === "USER" ? "👤 User" : "📄 Document"}
                    </span>
                    <span className="font-bold text-sm text-foreground">{report.targetName}</span>
                  </div>
                  <p className="text-sm text-foreground mb-1">
                    <span className="text-muted-foreground">Reason:</span> {report.reason}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Reported by: {report.reportedByName || report.reportedBy}</span>
                    {report.classId && <span>📚 Class: {report.classId.toUpperCase()}</span>}
                    <span>📅 {new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => handleAction(report.reportId, "REVIEWED")}
                    disabled={actionLoading === report.reportId}
                    className="px-4 py-2 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === report.reportId ? "..." : "✓ Reviewed"}
                  </button>
                  <button
                    onClick={() => handleAction(report.reportId, "DISMISSED")}
                    disabled={actionLoading === report.reportId}
                    className="px-4 py-2 text-xs font-semibold bg-muted text-muted-foreground border border-border rounded-md hover:bg-muted/80 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === report.reportId ? "..." : "Dismiss"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resolved Reports */}
      {resolvedReports.length > 0 && (
        <section className="bg-muted/10 border border-border/50 rounded-xl shadow-sm p-6 mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight">
              <span>📋</span> Resolved Reports
            </h2>
            <p className="text-muted-foreground text-xs mt-1">
              Previously reviewed or dismissed reports.
            </p>
          </div>
          <div className="space-y-2 mt-4">
            {resolvedReports.map((report) => (
              <div
                key={report.reportId}
                className="flex items-center justify-between bg-background/50 border border-border/40 rounded-lg px-4 py-3 opacity-70"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    report.status === "REVIEWED"
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-gray-100 text-gray-600 border border-gray-200"
                  }`}>
                    {report.status}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    report.type === "USER" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                  }`}>
                    {report.type}
                  </span>
                  <span className="font-semibold text-sm text-foreground">{report.targetName}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {report.updatedAt ? new Date(report.updatedAt).toLocaleDateString() : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
