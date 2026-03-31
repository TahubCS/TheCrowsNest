"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

const TABLES = ["TheCrowsNestUsers", "TheCrowsNestClasses", "TheCrowsNestMaterials", "TheCrowsNestStudyPlans", "TheCrowsNestRequests", "TheCrowsNestReports"];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState(TABLES[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Edit & Delete State
  const [editingRow, setEditingRow] = useState<any>(null);
  const [editJsonStr, setEditJsonStr] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

  // Reset search and sort when tab changes
  useEffect(() => {
    setSearchTerm("");
    setSortColumn(null);
    setSortDirection("asc");
    setEditingRow(null);
    setConfirmDeleteIndex(null);
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/databases?table=${activeTab}`)
      .then(res => res.json())
      .then(res => {
        setData(res.items || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [activeTab]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getRowKeys = (table: string, row: any) => {
    switch (table) {
      case "TheCrowsNestUsers": return { email: row.email };
      case "TheCrowsNestClasses": return { classId: row.classId };
      case "TheCrowsNestMaterials": return { classId: row.classId, materialId: row.materialId };
      case "TheCrowsNestStudyPlans": return { planId: row.planId };
      case "TheCrowsNestRequests": return { requestId: row.requestId };
      case "TheCrowsNestReports": return { reportId: row.reportId };
      default: return {};
    }
  };

  const startEdit = (row: any) => {
    setEditingRow(row);
    setEditJsonStr(JSON.stringify(row, null, 2));
  };

  const saveEdit = async () => {
    setIsSaving(true);
    try {
      const parsedItem = JSON.parse(editJsonStr);
      const res = await fetch("/api/admin/databases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: activeTab, item: parsedItem })
      });
      const dataRes = await res.json();
      if (dataRes.success) {
        // Update local state without re-fetching
        setData(prev => prev.map(item => {
           const keys = getRowKeys(activeTab, parsedItem);
           const isMatch = Object.keys(keys).every(k => item[k] === (keys as Record<string, any>)[k]);
           return isMatch ? parsedItem : item;
        }));
        setEditingRow(null);
      } else {
        toast.error("Failed to save: " + dataRes.message);
      }
    } catch (e) {
      toast.error("Invalid JSON format or network error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = async (row: any, index: number) => {
    if (confirmDeleteIndex === index) {
      // Execute Delete
      setDeletingIndex(index);
      const keys = getRowKeys(activeTab, row);
      try {
        const res = await fetch(`/api/admin/databases?table=${activeTab}&keys=${encodeURIComponent(JSON.stringify(keys))}`, {
          method: "DELETE"
        });
        const dataRes = await res.json();
        if (dataRes.success) {
          setData(prev => {
            const copy = [...prev];
            const matchIdx = copy.findIndex(item => Object.keys(keys).every(k => item[k] === (keys as Record<string, any>)[k]));
            if (matchIdx !== -1) copy.splice(matchIdx, 1);
            return copy;
          });
        } else {
          toast.error("Failed to delete: " + dataRes.message);
        }
      } catch (e) {
        toast.error("Error executing delete");
      } finally {
        setDeletingIndex(null);
        setConfirmDeleteIndex(null);
      }
    } else {
      // Enter confirm state
      setConfirmDeleteIndex(index);
      // Auto-reset confirm state after 3 seconds
      setTimeout(() => {
        setConfirmDeleteIndex(prev => prev === index ? null : prev);
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-background">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-border/60 pb-3 mb-4">
        <div className="flex space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {TABLES.map((table) => (
            <button
              key={table}
              onClick={() => setActiveTab(table)}
              className={`px-4 py-2 text-sm font-semibold rounded-md whitespace-nowrap transition-colors ${
                activeTab === table 
                  ? "bg-foreground text-background shadow-sm" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {table.replace("TheCrowsNest", "")}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64 shrink-0">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
            type="text"
            placeholder="Search database..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ecu-purple/50 transition-shadow"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-border/50 rounded-lg shadow-sm bg-muted/10 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium animate-pulse">
            Loading {activeTab.replace("TheCrowsNest", "")}...
          </div>
        ) : data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium">
            No records found in {activeTab.replace("TheCrowsNest", "")}.
          </div>
        ) : (() => {
          const allKeys = Array.from(new Set(data.flatMap(row => Object.keys(row))));
          const displayedKeys = allKeys.slice(0, 7);
          const hasMoreKeys = allKeys.length > 7;

          // 1. Filter
          let processedData = data;
          if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            processedData = data.filter(item => 
              Object.values(item).some(val => 
                val !== null && val !== undefined && String(val).toLowerCase().includes(lowerTerm)
              )
            );
          }

          // 2. Sort
          if (sortColumn) {
            processedData = [...processedData].sort((a, b) => {
              const aVal = a[sortColumn] !== undefined && a[sortColumn] !== null ? String(a[sortColumn]).toLowerCase() : "";
              const bVal = b[sortColumn] !== undefined && b[sortColumn] !== null ? String(b[sortColumn]).toLowerCase() : "";
              if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
              if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
              return 0;
            });
          }

          if (processedData.length === 0) {
            return (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium">
                No results match your search.
              </div>
            );
          }

          return (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/80 sticky top-0 z-10 border-b border-border/50 backdrop-blur-md">
                <tr>
                  {displayedKeys.map(key => (
                    <th 
                      key={key} 
                      onClick={() => handleSort(key)}
                      className="px-6 py-3 font-semibold text-foreground tracking-wide cursor-pointer hover:bg-muted/50 transition-colors select-none group"
                    >
                      <div className="flex items-center gap-1.5">
                        {key}
                        <span className={`text-[10px] text-muted-foreground transition-opacity ${sortColumn === key ? 'opacity-100 text-ecu-purple' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortColumn === key && sortDirection === 'desc' ? '▼' : '▲'}
                        </span>
                      </div>
                    </th>
                  ))}
                  {hasMoreKeys && (
                    <th className="px-6 py-3 font-semibold text-muted-foreground italic">...</th>
                  )}
                  <th className="px-6 py-3 font-semibold text-foreground tracking-wide text-right sticky right-0 bg-muted/80 backdrop-blur-md">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {processedData.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/40 transition-colors">
                    {displayedKeys.map(key => (
                      <td key={key} className="px-6 py-3 text-muted-foreground truncate max-w-[200px]">
                        {row[key] !== undefined && row[key] !== null 
                          ? typeof row[key] === "object" 
                            ? JSON.stringify(row[key]) 
                            : String(row[key])
                          : "-"}
                      </td>
                    ))}
                    {hasMoreKeys && (
                      <td className="px-6 py-3 text-muted-foreground italic truncate">...</td>
                    )}
                    <td className="px-6 py-3 text-right sticky right-0 bg-background/95 backdrop-blur-sm border-l border-border/50">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => startEdit(row)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(row, i)}
                          disabled={deletingIndex === i}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors border ${
                            confirmDeleteIndex === i 
                              ? "bg-red-600 hover:bg-red-700 text-white border-red-700 animate-pulse" 
                              : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                          } disabled:opacity-50 min-w[70px] text-center`}
                        >
                          {deletingIndex === i ? "..." : confirmDeleteIndex === i ? "Confirm?" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>

      {/* JSON Edit Modal */}
      {editingRow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/20">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span>✏️</span> Edit Record
              </h3>
              <button 
                onClick={() => setEditingRow(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto">
              <p className="text-sm text-muted-foreground mb-4">
                You are directly editing the raw JSON payload for this record. Ensure the schema is correct before saving.
              </p>
              <textarea 
                value={editJsonStr}
                onChange={(e) => setEditJsonStr(e.target.value)}
                className="w-full h-[400px] font-mono text-sm p-4 bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ecu-purple/50 resize-y"
                spellCheck={false}
              />
            </div>
            
            <div className="p-4 border-t border-border/50 bg-muted/20 flex justify-end gap-3">
              <button 
                onClick={() => setEditingRow(null)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={saveEdit}
                disabled={isSaving}
                className="px-6 py-2 text-sm font-bold rounded-lg bg-ecu-purple text-white hover:bg-ecu-purple/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
