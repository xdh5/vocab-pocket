import { useEffect, useState } from "react";

import type { AuthUser } from "./api/auth";
import * as authApi from "./api/auth";
import { getAuthToken } from "./api/http";
import { LoginPage } from "./components/LoginPage";
import { MobileReviewPage } from "./mobile/MobileReviewPage";
import { WordBookPage } from "./pages/WordBookPage";

export default function App() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    const requireLogin = () => setUser(null);
    window.addEventListener("vocaboom:auth-required", requireLogin);
    if (!getAuthToken()) setUser(null);
    else
      authApi
        .currentUser()
        .then(setUser)
        .catch(() => setUser(null));
    return () => window.removeEventListener("vocaboom:auth-required", requireLogin);
  }, []);

  if (user === undefined) return <main className="app-loading">正在打开词库…</main>;
  if (user === null) return <LoginPage onLogin={setUser} />;

  async function signOut() {
    await authApi.logout();
    setUser(null);
  }

  async function updateStudySettings(reviewTarget: number, newTarget: number) {
    setUser(await authApi.updateStudySettings(reviewTarget, newTarget));
  }

  return window.location.pathname.startsWith("/mobile") ? (
    <MobileReviewPage
      username={user.username}
      dailyReviewTarget={user.daily_review_target}
      dailyNewTarget={user.daily_new_target}
      onSettingsChange={(reviewTarget, newTarget) => void updateStudySettings(reviewTarget, newTarget)}
      onLogout={() => void signOut()}
    />
  ) : (
    <WordBookPage username={user.username} onLogout={() => void signOut()} />
  );
}
