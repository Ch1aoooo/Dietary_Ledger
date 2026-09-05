import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";
import { Onboarding } from "@/pages/Onboarding";
import { Upload } from "@/pages/Upload";
import { Dashboard } from "@/pages/Dashboard";
import { Transactions } from "@/pages/Transactions";
import { Review } from "@/pages/Review";
import { DietaryProfile } from "@/pages/DietaryProfile";
import { Settings } from "@/pages/Settings";

export default function App() {
  const { profile } = useApp();
  const location = useLocation();

  // 首次使用強制走 Onboarding（全螢幕，無 sidebar）
  if (!profile.onboarded && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Routes>
      <Route
        path="/onboarding"
        element={profile.onboarded ? <Navigate to="/" replace /> : <Onboarding />}
      />
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/review" element={<Review />} />
        <Route path="/profile" element={<DietaryProfile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
