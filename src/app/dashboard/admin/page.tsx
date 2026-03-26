"use client";

import { useState, useEffect } from "react";

const TABLES = ["TheCrowsNestUsers", "TheCrowsNestClasses", "TheCrowsNestMaterials"];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState(TABLES[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Reset search and sort when tab changes
  useEffect(() => {
    setSearchTerm("");
    setSortColumn(null);
    setSortDirection("asc");
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

  return (
    <div className="flex flex-col h-[600px] bg-background">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-3 mb-4">
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
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>
    </div>
  );
}
