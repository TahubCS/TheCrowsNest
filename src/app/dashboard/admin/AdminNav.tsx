"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Databases", path: "/dashboard/admin", icon: "🗄️" },
    { name: "Pending Uploads", path: "/dashboard/admin/materials", icon: "📄" },
    { name: "Pending Requests", path: "/dashboard/admin/requests", icon: "⏳" },
    { name: "Reports", path: "/dashboard/admin/reports", icon: "🚩" },
  ];

  return (
    <nav className="flex space-x-2 border-b border-border/60 mb-6 pb-0 overflow-x-auto">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-lg font-semibold transition-colors border-b-2 ${
              isActive 
                ? "border-red-500 text-red-500 bg-red-500/10" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 hover:border-border/50"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
