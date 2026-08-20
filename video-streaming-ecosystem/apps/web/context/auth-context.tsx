"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithFirebase: (idToken: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (name: string) => Promise<User>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "lumenstream_token";
const USER_KEY = "lumenstream_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const t = localStorage.getItem(TOKEN_KEY) || localStorage.getItem("token");
      const u = localStorage.getItem(USER_KEY);
      if (t) {
        setToken(t);
        if (u) setUser(JSON.parse(u));
      }
    } catch {}
    setLoading(false);
  }, []);

  const persist = (t: string, u: User) => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem("token", t); // fallback compat
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const clear = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${api}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      persist(data.token, data.user);
      router.push(data.user.role === "admin" ? "/admin" : "/user/dashboard");
    },
    [api, router]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch(`${api}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      persist(data.token, data.user);
    },
    [api]
  );

  const loginWithFirebase = useCallback(
    async (idToken: string) => {
      const res = await fetch(`${api}/api/auth/firebase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Firebase authentication failed");
      persist(data.token, data.user);
      router.push(data.user.role === "admin" ? "/admin" : "/user/dashboard");
    },
    [api, router]
  );

  const loginWithGoogle = useCallback(async () => {
    const { signInWithPopup } = await import("firebase/auth");
    const { auth, googleProvider } = await import("@/lib/firebase-client");
    const cred = await signInWithPopup(auth, googleProvider);
    const idToken = await cred.user.getIdToken();
    await loginWithFirebase(idToken);
  }, [loginWithFirebase]);

  const logout = useCallback(() => {
    clear();
    router.push("/sign-in");
  }, [router]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${api}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      clear();
      return;
    }
    const u = await res.json();
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, [api, token]);

  const updateProfile = useCallback(
    async (name: string) => {
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${api}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      localStorage.setItem(USER_KEY, JSON.stringify(data));
      setUser(data);
      return data as User;
    },
    [api, token]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      loginWithFirebase,
      loginWithGoogle,
      logout,
      refreshUser,
      updateProfile,
    }),
    [user, token, loading, login, register, loginWithFirebase, loginWithGoogle, logout, refreshUser, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
