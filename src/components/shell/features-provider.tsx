"use client";

import { useAuth } from "@clerk/nextjs";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/client-api";
import { stageAllows, type Capability, type ReleaseStage } from "@/lib/release-stage";

// Tells the screens which release stage is running, and who is looking (admins can always do everything).
// This only decides what to SHOW. The API checks the stage and the role again on the server.

type Me = { role: "user" | "admin"; banned: boolean };
type Value = { stage: ReleaseStage; signedIn: boolean; authReady: boolean; me: Me | null; meReady: boolean };

// Without a provider (in tests, or a page outside the layout) everything is open.
const Ctx = createContext<Value>({ stage: 4, signedIn: false, authReady: true, me: null, meReady: true });

export function FeaturesProvider({ stage, children }: { stage: ReleaseStage; children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [fetched, setFetched] = useState<{ me: Me | null; done: boolean }>({ me: null, done: false });

  // Once we know the person is logged in, ask who they are (one request for the whole site).
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    apiFetch<Me>("/api/v1/me").then((result) => {
      if (!cancelled) setFetched({ me: result.ok ? result.data : null, done: true });
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const value = useMemo<Value>(
    () => ({
      stage,
      signedIn: !!isSignedIn,
      authReady: isLoaded,
      me: isSignedIn ? fetched.me : null,
      meReady: isLoaded && (!isSignedIn || fetched.done),
    }),
    [stage, isSignedIn, isLoaded, fetched],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Who is logged in: undefined role until we know.
export function useMe() {
  const { me, meReady } = useContext(Ctx);
  return { role: me?.role ?? null, banned: me?.banned ?? false, ready: meReady };
}

// Is this feature open for the current visitor?
//   allowed: yes or no.   ready: false while we still check whether an admin is looking.
export function useFeature(capability: Capability): { allowed: boolean; ready: boolean } {
  const { stage, signedIn, authReady, me, meReady } = useContext(Ctx);
  if (stageAllows(stage, capability)) return { allowed: true, ready: true };
  if (!authReady) return { allowed: false, ready: false };
  if (!signedIn) return { allowed: false, ready: true };
  if (!meReady) return { allowed: false, ready: false };
  return { allowed: me?.role === "admin" && !me.banned, ready: true };
}
