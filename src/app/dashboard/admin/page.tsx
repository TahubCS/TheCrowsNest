"use client";

import { useState, useEffect } from "react";

const TABLES = ["TheCrowsNestUsers", "TheCrowsNestClasses", "TheCrowsNestMaterials"];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState(TABLES[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex flex-col h-[600px] bg-background">
      <div className="flex space-x-2 border-b border-border/60 pb-2 mb-4 overflow-x-auto">
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

          return (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/80 sticky top-0 z-10 border-b border-border/50 backdrop-blur-md">
                <tr>
                  {displayedKeys.map(key => (
                    <th key={key} className="px-6 py-3 font-semibold text-foreground tracking-wide">{key}</th>
                  ))}
                  {hasMoreKeys && (
                    <th className="px-6 py-3 font-semibold text-muted-foreground italic">...</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.map((row, i) => (
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
