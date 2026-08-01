"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import type { PublicUser } from "@/features/auth/types";
import { AppShell, AsciiYarn } from "@/shared/ui";

export interface AppShellClientProps {
  children: ReactNode;
}

/**
 * Costura entre el design system (presentación pura) y el backend. Este Client
 * Component es quien SÍ conoce las rutas y hace fetch: puebla el usuario del nav
 * con `GET /api/auth/me` y cablea el logout (`POST /api/auth/logout` + redirect).
 * `AppShell` sólo recibe datos y callbacks (SDD §2, conventions "Presentación pura").
 */
export function AppShellClient({ children }: AppShellClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { user: PublicUser };
        if (!cancelled) {
          setUser(data.user);
        }
      } catch {
        // Sin usuario en el nav: el shell sigue funcionando (no bloquea el render).
      }
    }
    void loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }, [router]);

  return (
    <AppShell
      user={user}
      onLogout={() => void handleLogout()}
      background={<AsciiYarn />}
    >
      {children}
    </AppShell>
  );
}
