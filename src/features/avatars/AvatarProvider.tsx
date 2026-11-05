"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/features/identity/AuthProvider";
import { DEFAULT_AI_AVATAR, isAiAvatarId, type AiAvatarId } from "./catalog";

/**
 * Keeps the user's picture and AI avatar choice.
 * Source of truth is the account (database); localStorage is the instant cache
 * and the fallback when the account store cannot be reached.
 */
const AI_KEY = "shopngo_ai_avatar";
const IMG_KEY = "shopngo_user_picture";

type SaveResult = { ok: boolean; where: "account" | "device"; error?: string };

type Ctx = {
  aiAvatar: AiAvatarId;
  /** Uploaded picture (data URL) or null. */
  customImage: string | null;
  /** Picture to show: uploaded, else Firebase photo, else null (initials). */
  userImage: string | null;
  displayName: string;
  setAiAvatar: (id: AiAvatarId) => Promise<SaveResult>;
  setCustomImage: (dataUrl: string | null) => Promise<SaveResult>;
};

const AvatarContext = createContext<Ctx>({
  aiAvatar: DEFAULT_AI_AVATAR,
  customImage: null,
  userImage: null,
  displayName: "You",
  setAiAvatar: async () => ({ ok: false, where: "device" }),
  setCustomImage: async () => ({ ok: false, where: "device" }),
});

export function useAvatars() {
  return useContext(AvatarContext);
}

function lsGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

export function AvatarProvider({ children }: { children: ReactNode }) {
  const { appUser, firebaseUser, getIdToken } = useAuth();
  const [aiAvatar, setAi] = useState<AiAvatarId>(DEFAULT_AI_AVATAR);
  const [customImage, setImage] = useState<string | null>(null);
  const uid = appUser?.id ?? null;

  // Instant values from this device, then the account copy.
  useEffect(() => {
    const ai = lsGet(AI_KEY);
    if (isAiAvatarId(ai)) setAi(ai);
    setImage(uid ? lsGet(`${IMG_KEY}_${uid}`) : null);
    if (!uid) return;
    let cancelled = false;
    (async () => {
      const token = await getIdToken();
      if (!token) return;
      try {
        const res = await fetch("/api/profile/avatar", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { image: string | null; aiAvatar: string | null };
        if (cancelled) return;
        if (isAiAvatarId(data.aiAvatar)) {
          setAi(data.aiAvatar);
          lsSet(AI_KEY, data.aiAvatar);
        }
        setImage(data.image);
        lsSet(`${IMG_KEY}_${uid}`, data.image);
      } catch {
        /* keep the device copy */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, getIdToken]);

  const save = useCallback(
    async (body: Record<string, unknown>): Promise<SaveResult> => {
      const token = await getIdToken();
      if (!token) return { ok: true, where: "device" };
      try {
        const res = await fetch("/api/profile/avatar", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) return { ok: true, where: "account" };
        if (res.status === 400 || res.status === 429) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          return { ok: false, where: "device", error: d.error ?? "That change was not accepted." };
        }
      } catch {
        /* fall through: kept on this device */
      }
      return { ok: true, where: "device" };
    },
    [getIdToken]
  );

  const setAiAvatar = useCallback(
    async (id: AiAvatarId) => {
      setAi(id);
      lsSet(AI_KEY, id);
      return save({ aiAvatar: id });
    },
    [save]
  );

  const setCustomImage = useCallback(
    async (dataUrl: string | null) => {
      const r = await save({ image: dataUrl });
      if (r.ok) {
        setImage(dataUrl);
        if (uid) lsSet(`${IMG_KEY}_${uid}`, dataUrl);
      }
      return r;
    },
    [save, uid]
  );

  const value = useMemo<Ctx>(
    () => ({
      aiAvatar,
      customImage,
      userImage: customImage ?? firebaseUser?.photoURL ?? null,
      displayName: appUser?.displayName || firebaseUser?.displayName || appUser?.email || "You",
      setAiAvatar,
      setCustomImage,
    }),
    [aiAvatar, customImage, firebaseUser, appUser, setAiAvatar, setCustomImage]
  );

  return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>;
}
