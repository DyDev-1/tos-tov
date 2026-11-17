"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/client-api";
import type { ViewerState } from "@/lib/validation/engagement";

// Shares like / save state between every button on the place page
// (the pills, and the phone's photo overlay), so they never disagree.

type Value = {
  liked: boolean;
  saved: boolean;
  likesCount: number;
  error: boolean;
  toggleLike: () => void;
  toggleSave: () => void;
};

const Ctx = createContext<Value | null>(null);

export function useEngagement() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useEngagement must be used inside <EngagementProvider>");
  return value;
}

export function EngagementProvider({
  slug,
  initialLikesCount,
  children,
}: {
  slug: string;
  initialLikesCount: number;
  children: ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [error, setError] = useState(false);

  // Once we know the person is logged in, ask what they already liked or saved.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    apiFetch<ViewerState>(`/api/v1/places/${slug}/me`).then((result) => {
      if (cancelled || !result.ok) return;
      setLiked(result.data.liked);
      setSaved(result.data.saved);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, slug]);

  const toggleLike = useCallback(async () => {
    if (!isSignedIn) return clerk.openSignIn();
    const next = !liked;
    // Show the change at once, and undo it if the server says no ("optimistic update").
    setLiked(next);
    setLikesCount((n) => Math.max(0, n + (next ? 1 : -1)));
    setError(false);
    const result = await apiFetch<{ liked: boolean; likesCount: number }>(`/api/v1/places/${slug}/like`, {
      method: next ? "PUT" : "DELETE",
    });
    if (result.ok) setLikesCount(result.data.likesCount);
    else {
      setLiked(!next);
      setLikesCount((n) => Math.max(0, n + (next ? -1 : 1)));
      setError(true);
    }
  }, [isSignedIn, clerk, liked, slug]);

  const toggleSave = useCallback(async () => {
    if (!isSignedIn) return clerk.openSignIn();
    const next = !saved;
    setSaved(next);
    setError(false);
    const result = await apiFetch(`/api/v1/places/${slug}/save`, { method: next ? "PUT" : "DELETE" });
    if (!result.ok) {
      setSaved(!next);
      setError(true);
    }
  }, [isSignedIn, clerk, saved, slug]);

  const value = useMemo(
    () => ({ liked, saved, likesCount, error, toggleLike, toggleSave }),
    [liked, saved, likesCount, error, toggleLike, toggleSave],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
