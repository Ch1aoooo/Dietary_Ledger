import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AppProvider } from "@/lib/store";
import { UsersProvider, useUsers } from "@/lib/users";
import "./index.css";

/**
 * AppProvider 的 key 是目前使用中的使用者 id：key 改變時 React 會把整棵
 * 子樹整個卸載再重新掛載，AppProvider 裡所有 useState(() => load(...))
 * 都會用新使用者的 namespaced key 重新讀一次——這是讓「切換使用者」變成
 * 徹底獨立的一份新資料，而不是沿用上一個使用者殘留的 state 的關鍵。見
 * lib/store.tsx 的 storageKey() 說明。
 */
function Root() {
  const { activeUserId } = useUsers();
  return (
    <AppProvider key={activeUserId}>
      <App />
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <UsersProvider>
        <Root />
      </UsersProvider>
    </BrowserRouter>
  </React.StrictMode>
);
