import { Bell, Search } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/admin/login?next=/admin");

  return (
    <div className="flex min-h-screen bg-[#f1f0ee]">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-black/5 bg-white px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 rounded-lg bg-brand-cream px-3 py-2 text-sm text-brand-ink/50 md:w-80">
            <Search size={16} />
            <input
              placeholder="Buscar pedidos, productos, clientes…"
              className="w-full bg-transparent outline-none placeholder:text-brand-ink/40"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-brand-ink/60 hover:bg-black/5">
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-red" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-red text-sm font-bold text-white">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-sm leading-tight sm:block">
                <p className="font-semibold text-brand-ink">{session.name}</p>
                <p className="text-xs text-brand-ink/50">Administrador · Entre Ríos</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
