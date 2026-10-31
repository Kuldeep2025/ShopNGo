"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  subscribeToAuthChanges,
  logOut as firebaseLogOut,
  type User as FirebaseUser,
} from "@/lib/auth/firebase-client";
import { isFirebaseConfigured } from "@/lib/env";

export type AppUser = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
};

type AuthState = {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  configured: boolean;
  getIdToken: () => Promise<string | null>;
  refreshAppUser: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = typeof window !== "undefined" ? isFirebaseConfigured() : false;

  const getIdToken = useCallback(async () => {
    if (!firebaseUser) return null;
    try {
      return await firebaseUser.getIdToken();
    } catch {
      return null;
    }
  }, [firebaseUser]);

  const refreshAppUser = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setAppUser(null);
      return;
    }
    try {
      const res = await fetch("/api/auth/session", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setAppUser(null);
        return;
      }
      const data = await res.json();
      setAppUser(data.user ?? null);
    } catch {
      setAppUser(null);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToAuthChanges(async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          const res = await fetch("/api/auth/session", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setAppUser(data.user ?? null);
          } else {
            setAppUser(null);
          }
        } catch {
          setAppUser(null);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [configured]);

  const signOut = useCallback(async () => {
    await firebaseLogOut();
    setAppUser(null);
    setFirebaseUser(null);
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      appUser,
      loading,
      configured,
      getIdToken,
      refreshAppUser,
      signOut,
    }),
    [firebaseUser, appUser, loading, configured, getIdToken, refreshAppUser, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
