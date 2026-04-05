import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const admin = await isAdmin(session.user.email);
  if (!admin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Admin Control Panel</h1>
        <p className="text-muted-foreground mt-1">Manage platform data, requests, and reports.</p>
      </div>

      <AdminNav />

      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
