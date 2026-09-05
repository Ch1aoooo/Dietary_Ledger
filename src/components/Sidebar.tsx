import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  UploadCloud,
  UserRound,
  ReceiptText,
  ListChecks,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  UserPlus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { useUsers, type UserRecord } from "@/lib/users";
import { AddUserDialog } from "@/components/AddUserDialog";
import { DeleteUserDialog } from "@/components/DeleteUserDialog";

const NAV = [
  { to: "/", label: t("總覽"), icon: LayoutGrid, end: true },
  { to: "/upload", label: t("上傳資料"), icon: UploadCloud },
  { to: "/profile", label: t("飲食檔案"), icon: UserRound },
  { to: "/transactions", label: t("交易明細"), icon: ReceiptText },
  { to: "/review", label: t("待確認"), icon: ListChecks },
];

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { reviews } = useApp();
  const { users, activeUserId, switchUser } = useUsers();
  const [addUserOpen, setAddUserOpen] = useState(false);
  // 右鍵使用者列 → 顯示一個只有「刪除使用者」的小選單 → 點了才跳確認對話
  // 框（見 components/DeleteUserDialog.tsx）。deleteTarget 存的是「使用者
  // 完整物件」而不是 id，這樣 DeleteUserDialog 可以直接顯示名字，不用
  // 再反查一次 users 陣列。
  const [contextMenu, setContextMenu] = useState<{ userId: string; x: number; y: number } | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pending = reviews.filter((r) => r.confirmed == null).length;

  // 右鍵選單開著時，點選單以外的地方或按 Esc 都要關掉。
  //
  // 一開始這裡不管點在哪裡、mousedown 一律關閉選單，結果點選單裡的
  // 「刪除使用者」本身會炸掉：mousedown 在 click 之前先觸發、把選單從
  // DOM 拿掉，React 接著處理那顆按鈕自己的 onClick（也會呼叫
  // setContextMenu(null)）時，兩條路徑都想動同一段 DOM，reconciler 對不上
  // 就丟 NotFoundError: Failed to execute 'removeChild'。改成用 menuRef
  // 判斷「點的地方是不是在選單裡面」，選單內的點擊完全不會觸發這裡，只有
  // 按鈕自己的 onClick 會關閉選單——只剩一條路徑在動 DOM，不會再打架。
  useEffect(() => {
    if (!contextMenu) return;
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

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
              {to === "/review" && pending > 0 && (
                <span className="ml-2.5 rounded-full bg-destructive px-1.5 py-0.5 text-2xs font-semibold text-destructive-foreground">
                  {pending}
                </span>
              )}
            </Fade>
          </NavLink>
        ))}

        <div className={cn("pt-3", collapsed && "flex justify-center")}>
          <NavLink
            to="/settings"
            title={collapsed ? t("設定") : undefined}
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
              <span className="whitespace-nowrap">{t("設定")}</span>
            </Fade>
          </NavLink>
        </div>
      </nav>

      {/*
        使用者切換器：每個使用者的資料完全獨立（見 lib/store.tsx 的
        storageKey()）。目前使用中的那個顯示綠色（--confirmed，這個設計
        系統裡本來就標成「綠」的 token，飽和度/亮度中等，不會淺得像灰色
        也不會深得像黑色），其餘顯示灰階、點了就切換過去。
      */}
      <div
        className={cn(
          "m-3 space-y-1 rounded-2xl border border-border/70 bg-muted/60 p-2 transition-[padding] duration-300 ease-in-out",
          collapsed && "p-1.5"
        )}
      >
        {users.map((u) => {
          const active = u.id === activeUserId;
          return (
            <button
              key={u.id}
              onClick={() => switchUser(u.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ userId: u.id, x: e.clientX, y: e.clientY });
              }}
              title={collapsed ? t(u.name) : t("右鍵可以刪除這個使用者")}
              className={cn(
                "flex w-full items-center rounded-xl px-2 py-2 text-left transition-colors duration-300 ease-in-out",
                collapsed && "justify-center px-0",
                active
                  ? "bg-confirmed"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold",
                  active ? "bg-white/20 text-white" : "bg-secondary text-secondary-foreground"
                )}
              >
                {initials(t(u.name))}
              </div>
              <Fade collapsed={collapsed} className="leading-tight">
                <p
                  className={cn(
                    "truncate whitespace-nowrap text-sm font-medium",
                    active ? "text-white" : "text-foreground"
                  )}
                >
                  {t(u.name)}
                </p>
                <p
                  className={cn(
                    "whitespace-nowrap text-2xs",
                    active ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  {active ? t("使用中") : t("點擊切換")}
                </p>
              </Fade>
            </button>
          );
        })}

        <button
          onClick={() => setAddUserOpen(true)}
          title={collapsed ? t("新增其他使用者") : undefined}
          className={cn(
            "flex w-full items-center rounded-xl px-2 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-dashed border-border text-muted-foreground">
            <UserPlus className="h-4 w-4" />
          </div>
          <Fade collapsed={collapsed} className="leading-tight">
            <span className="whitespace-nowrap">{t("新增其他使用者")}</span>
          </Fade>
        </button>
      </div>

      <div className="border-t border-border/70 p-3">
        <button
          onClick={onToggle}
          title={collapsed ? t("展開側欄") : t("收合側欄")}
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
            <span className="whitespace-nowrap text-left">{t("收合側欄")}</span>
          </Fade>
        </button>
      </div>

      <AddUserDialog open={addUserOpen} onOpenChange={setAddUserOpen} />

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 w-44 rounded-xl border border-border/70 bg-card p-1 soft-shadow"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 60),
            left: Math.min(contextMenu.x, window.innerWidth - 180),
          }}
        >
          <button
            onClick={() => {
              const target = users.find((u) => u.id === contextMenu.userId) ?? null;
              setDeleteTarget(target);
              setContextMenu(null);
            }}
            disabled={users.length <= 1}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> {t("刪除使用者")}
          </button>
        </div>
      )}

      <DeleteUserDialog user={deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} />
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
