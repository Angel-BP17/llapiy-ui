import { useEffect, useMemo, useState } from "react";
import { can, getAuthSession, type AuthSession } from "@/lib/auth-session";

export function useAuthPermissions() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void getAuthSession()
      .then((nextSession) => {
        if (!active) return;
        setSession(nextSession);
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return useMemo(
    () => ({
      session,
      isLoading,
      can: (permission: string) => can(session, permission),
      hasKnownPermissions: Boolean(session?.permissions.length),
    }),
    [session, isLoading]
  );
}
