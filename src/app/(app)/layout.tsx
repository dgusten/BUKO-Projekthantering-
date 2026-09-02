import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="shell">
      <Sidebar user={user} />
      <div className="main">{children}</div>
    </div>
  );
}
