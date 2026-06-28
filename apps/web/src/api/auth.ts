import { apiRequest, setAuthToken } from "./http";

export type AuthUser = {
  id: number;
  username: string;
  daily_review_target: number;
  daily_new_target: number;
};

type LoginResponse = { token: string; user: AuthUser };

export async function login(username: string, password: string): Promise<AuthUser> {
  const response = await apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  setAuthToken(response.token);
  return response.user;
}

export function currentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/auth/me");
}

export function updateStudySettings(dailyReviewTarget: number, dailyNewTarget: number): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/auth/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      daily_review_target: dailyReviewTarget,
      daily_new_target: dailyNewTarget,
    }),
  });
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>("/api/auth/logout", { method: "POST" });
  } finally {
    setAuthToken("");
  }
}
