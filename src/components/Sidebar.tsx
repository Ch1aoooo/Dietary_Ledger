import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  UploadCloud,
  UserRound,
  ReceiptText,
  ListChecks,
  Stethoscope,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/upload", label: "Upload Data", icon: UploadCloud },
  { to: "/profile", label: "Dietary Profile", icon: UserRound },
  { to: "/transactions", label: "Transactions", icon: ReceiptText },
  { to: "/review", label: "Review", icon: ListChecks },
  { to: "/clinical", label: "Clinical Summary", icon: Stethoscope },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { reviews } = useApp();
  const pending = reviews.filter((r) => r.confirmed == null).length;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r border-border/70 bg-card/70 backdrop-blur transition-[width] duration-300 ease-in-out will-change-[width] md:flex",
        collapsed ? "w-[72px]" : "w-[248px]"
      )}
    >
      <div
        className={cn(
          "flex items-center px-6 py-6 transition-[padding] duration-300 ease-in-out",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ReceiptText className="h-5 w-5" />
        </div>
        <Fade collapsed={collapsed} className="leading-tight">
          <p className="whitespace-nowrap font-display text-[15px] font-semibold text-foreground">
            食溯
          </p>
          <p className="whitespace-nowrap text-2xs uppercase tracking-[0.14em] text-muted-foreground">
            Dietary Ledger
          </p>
        </Fade>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-300 ease-in-out",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <Fade collapsed={collapsed} className="flex flex-1 items-center justify-between">
              <span className="whitespace-nowrap">{label}</span>
              {label === "Review" && pending > 0 && (
                <span className="rounded-full bg-warning/90 px-1.5 py-0.5 text-2xs font-semibold text-white">
                  {pending}
                </span>
              )}
            </Fade>
          </NavLink>
        ))}

        <div className={cn("pt-3", collapsed && "flex justify-center")}>
          <NavLink
            to="/settings"
            title={collapsed ? "Settings" : undefined}
            className={({ isActive }) =>
              cn(
                "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-300 ease-in-out",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            <Fade collapsed={collapsed} className="flex-1">
              <span className="whitespace-nowrap">Settings</span>
            </Fade>
          </NavLink>
        </div>
      </nav>

      <div
        className={cn(
          "m-3 rounded-2xl border border-border/70 bg-muted/60 p-3 transition-[padding] duration-300 ease-in-out",
          collapsed && "p-2"
        )}
      >
        <div className={cn("flex items-center", collapsed && "justify-center")}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
            DU
          </div>
          <Fade collapsed={collapsed} className="leading-tight">
            <p className="whitespace-nowrap text-sm font-medium text-foreground">Demo User</p>
            <p className="whitespace-nowrap text-2xs text-muted-foreground">Personal plan</p>
          </Fade>
        </div>
      </div>

      <div className="border-t border-border/70 p-3">
        <button
          onClick={onToggle}
          title={collapsed ? "展開側欄" : "收合側欄"}
          className={cn(
            "flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-in-out hover:bg-accent hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          <span className="relative grid h-[18px] w-[18px] shrink-0 place-items-center">
            <PanelLeftClose
              className={cn(
                "absolute h-[18px] w-[18px] transition-opacity duration-300 ease-in-out",
                collapsed ? "opacity-0" : "opacity-100"
              )}
            />
            <PanelLeftOpen
              className={cn(
                "absolute h-[18px] w-[18px] transition-opacity duration-300 ease-in-out",
                collapsed ? "opacity-100" : "opacity-0"
              )}
            />
          </span>
          <Fade collapsed={collapsed} className="flex-1">
            <span className="whitespace-nowrap text-left">收合側欄</span>
          </Fade>
        </button>
      </div>
    </aside>
  );
}

/**
 * 側欄收合時，文字內容以「寬度 + 透明度」一起淡出/淡入，
 * 而不是直接卸載元件——避免收放時文字瞬間彈出/消失的跳動感。
 */
function Fade({
  collapsed,
  className,
  children,
}: {
  collapsed: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden transition-[max-width,opacity,margin-left] duration-300 ease-in-out",
        collapsed ? "ml-0 max-w-0 opacity-0" : "ml-3 max-w-[180px] opacity-100"
      )}
    >
      <div className={className}>{children}</div>
    </div>
  );
}
