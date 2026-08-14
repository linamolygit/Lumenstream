"use client";

import { useAuth } from "@/context/auth-context";
import { useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function useUserApi() {
  const { token } = useAuth();

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const get = useCallback(
    async (path: string) => {
      const res = await fetch(`${API}${path}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
    [authHeaders]
  );

  const post = useCallback(
    async (path: string, body?: object) => {
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: authHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
    [authHeaders]
  );

  const del = useCallback(
    async (path: string) => {
      const res = await fetch(`${API}${path}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
    [authHeaders]
  );

  const patch = useCallback(
    async (path: string, body: object) => {
      const res = await fetch(`${API}${path}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
    [authHeaders]
  );

  return { get, post, del, patch };
}
