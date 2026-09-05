import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  UploadCloud,
  UserRound,
  ReceiptText,
  ListChecks,
  Stethoscope,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 桌面版 Sidebar 有 /settings，這裡原本漏掉——手機版完全沒有入口能到
// Settings（唯一能切換分析引擎、重設資料的頁面）。
const ITEMS = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/transactions", label: "Txns", icon: ReceiptText },
  { to: "/review", label: "Review", icon: ListChecks },
  { to: "/clinical", label: "Clinical", icon: Stethoscope },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  return (
    <div className="sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-border/70 bg-background/90 px-3 py-2 backdrop-blur md:hidden">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )
          }
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </NavLink>
      ))}
    </div>
  );
}
