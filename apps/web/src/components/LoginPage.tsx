import { type FormEvent, useState } from "react";

import type { AuthUser } from "../api/auth";
import * as authApi from "../api/auth";

type LoginPageProps = { onLogin: (user: AuthUser) => void };

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      onLogin(await authApi.login(username.trim(), password));
      setError("");
    } catch {
      setError("用户名或密码不正确");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <img className="login-mark" src="/app-icon.png" alt="项目图标" />
        <form onSubmit={submit}>
          <label>
            用户名
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            密码
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <small>{error}</small>}
          <button type="submit" disabled={submitting || !username.trim() || !password}>
            {submitting ? "正在登录…" : "登录"}
          </button>
        </form>
      </section>
    </main>
  );
}
