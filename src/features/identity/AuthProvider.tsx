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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Loads the app user, retrying so a slow or sleeping server never looks like "signed out". */
async function fetchAppUser(user: FirebaseUser): Promise<AppUser | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const token = await user.getIdToken(attempt > 0);
      const res = await fetch("/api/auth/session", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) return data.user as AppUser;
      }
    } catch {
      /* try again */
    }
    await sleep(1200 * (attempt + 1));
  }
  return null;
}

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
    if (!firebaseUser) {
      setAppUser(null);
      return;
    }
    setAppUser(await fetchAppUser(firebaseUser));
  }, [firebaseUser]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToAuthChanges(async (user) => {
      setFirebaseUser(user);
      if (user) {
        setAppUser(await fetchAppUser(user));
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
