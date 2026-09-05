import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { DietCoach } from "@/components/DietCoach";
import { cn } from "@/lib/utils";

const LS_SIDEBAR = "dl.sidebarCollapsed.v1";

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(LS_SIDEBAR) === "1";
  } catch {
    return false;
  }
}

function saveCollapsed(v: boolean) {
  try {
    localStorage.setItem(LS_SIDEBAR, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const toggle = () =>
    setCollapsed((c) => {
      saveCollapsed(!c);
      return !c;
    });

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <MobileNav />
      <div
        className={cn(
          "transition-[padding] duration-300 ease-in-out",
          collapsed ? "md:pl-[72px]" : "md:pl-[248px]"
        )}
      >
        <Header />
        <main className="mx-auto max-w-[1200px] px-6 pb-20 md:px-10">
          <Outlet />
        </main>
        <DietCoach />
      </div>
    </div>
  );
}
