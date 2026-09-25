import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getToken, setToken } from "@/services/api";
import * as authService from "@/services/authService";
import type { Credentials, User } from "@/types/auth";

interface AuthState {
  user: User | null;
  /** false until the saved token has been checked: avoids loading the anonymous list first. */
  ready: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!getToken());

  useEffect(() => {
    if (!getToken()) return;
    authService
      .getMe()
      .then(setUser)
      .catch(() => setToken(null)) // expired or invalid: continue as anonymous
      .finally(() => setReady(true));
  }, []);

  async function start(request: Promise<{ access_token: string; user: User }>) {
    const { access_token, user } = await request;
    setToken(access_token);
    setUser(user);
  }

  const value: AuthState = {
    user,
    ready,
    login: (credentials) => start(authService.login(credentials)),
    register: (credentials) => start(authService.register(credentials)),
    logout: () => {
      setToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
