import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface UserRecord {
  id: string;
  name: string;
}

const LS_USERS = "dl.users.v1";
const LS_ACTIVE_USER = "dl.activeUserId.v1";

/**
 * 第一個使用者固定用這個 id，讓它在 lib/store.tsx 裡對應到「不加前綴」的
 * 原始 localStorage key（dl.profile.v1、dl.upload.v1…）。這個功能是後來
 * 加的，改版前只有單一使用者、資料本來就存在這些不帶前綴的 key 裡——
 * 這樣接上多使用者後，原本的資料還是讀得到，不需要另外寫遷移邏輯。
 */
export const DEFAULT_USER_ID = "default";
const DEFAULT_USERS: UserRecord[] = [{ id: DEFAULT_USER_ID, name: "示範使用者" }];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

interface UsersState {
  users: UserRecord[];
  activeUserId: string;
  activeUser: UserRecord;
  /** 新增一個使用者並立刻切成使用中——資料完全獨立，見 lib/store.tsx。 */
  addUser: (name: string) => void;
  switchUser: (id: string) => void;
  /** 刪掉一個使用者，連同他所有的飲食資料。至少要留一個使用者，
   *  users.length <= 1 時直接不做事（呼叫端在 UI 上也要擋掉這個按鈕，
   *  見 components/DeleteUserDialog.tsx）。 */
  removeUser: (id: string) => void;
}

const UsersContext = createContext<UsersState | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserRecord[]>(() => load(LS_USERS, DEFAULT_USERS));
  const [activeUserId, setActiveUserId] = useState<string>(() =>
    load(LS_ACTIVE_USER, DEFAULT_USER_ID)
  );

  const addUser = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    setUsers((list) => {
      const next = [...list, { id, name: trimmed }];
      save(LS_USERS, next);
      return next;
    });
    setActiveUserId(id);
    save(LS_ACTIVE_USER, id);
  }, []);

  const switchUser = useCallback((id: string) => {
    setActiveUserId(id);
    save(LS_ACTIVE_USER, id);
  }, []);

  // 刪除使用者：不用知道 lib/store.tsx 裡實際定義了哪些 per-user key
  // （profile/upload/manual/deleted/dateRanges/confirm/unsure……以後可能
  // 還會加）——storageKey() 那邊統一用 "<base>::<userId>" 當 namespace，
  // 這裡直接掃過 localStorage 找尾碼吻合的 key 整批刪掉，兩邊永遠不會
  // 因為忘記同步新增的 key 而漏刪。
  const removeUser = useCallback(
    (id: string) => {
      if (users.length <= 1) return; // 至少要留一個使用者，app 才有東西可顯示
      const suffix = `::${id}`;
      for (const key of Object.keys(localStorage)) {
        if (key.endsWith(suffix)) localStorage.removeItem(key);
      }
      const next = users.filter((u) => u.id !== id);
      setUsers(next);
      save(LS_USERS, next);
      if (activeUserId === id) {
        const nextActive = next[0].id;
        setActiveUserId(nextActive);
        save(LS_ACTIVE_USER, nextActive);
      }
    },
    [users, activeUserId]
  );

  const activeUser =
    users.find((u) => u.id === activeUserId) ?? users[0] ?? DEFAULT_USERS[0];

  return (
    <UsersContext.Provider
      value={{ users, activeUserId, activeUser, addUser, switchUser, removeUser }}
    >
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers(): UsersState {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error("useUsers must be used within UsersProvider");
  return ctx;
}
