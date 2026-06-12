"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Tag,
  BarChart3,
  Settings,
  Store,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/ofertas", label: "Ofertas", icon: Tag },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/admin/config", label: "Configuración", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-brand-ink text-white md:flex">
      <div className="border-b border-white/10 px-5 py-4">
        <Logo dark />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-brand-red text-white" : "text-white/65 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/65 hover:bg-white/10 hover:text-white"
        >
          <Store size={18} /> Ver tienda
        </Link>
        <LogoutButton className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/65 hover:bg-white/10 hover:text-white" />
      </div>
    </aside>
  );
}
