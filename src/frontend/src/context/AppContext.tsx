import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserProfile } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { getBackend, setBackendIdentity } from "../utils/backendSingleton";

export type { UserProfile };

interface AppContextType {
  isAdmin: boolean;
  userProfile: UserProfile | null;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { identity } = useInternetIdentity();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const b = await getBackend();
      const profile = await b.getCallerUserProfile();
      setUserProfile(profile);
    } catch {
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    setBackendIdentity(identity ?? undefined);

    const checkAdmin = async () => {
      try {
        const b = await getBackend();
        const admin = await b.isCallerAdmin();
        setIsAdmin(admin);
      } catch {
        setIsAdmin(false);
      }
    };

    if (identity) {
      checkAdmin();
      refreshProfile();
    } else {
      setIsAdmin(false);
      setUserProfile(null);
    }
  }, [identity, refreshProfile]);

  return (
    <AppContext.Provider value={{ isAdmin, userProfile, refreshProfile }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
