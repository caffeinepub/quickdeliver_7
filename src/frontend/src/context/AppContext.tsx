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
  isDriver: boolean;
  userProfile: UserProfile | null;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { identity } = useInternetIdentity();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
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

    const checkRoles = async () => {
      try {
        const b = await getBackend();
        const [admin, driver] = await Promise.all([
          b.isCallerAdmin(),
          b.isCallerDriver(),
        ]);
        setIsAdmin(admin);
        setIsDriver(driver);
      } catch {
        setIsAdmin(false);
        setIsDriver(false);
      }
    };

    if (identity) {
      checkRoles();
      refreshProfile();
    } else {
      setIsAdmin(false);
      setIsDriver(false);
      setUserProfile(null);
    }
  }, [identity, refreshProfile]);

  return (
    <AppContext.Provider
      value={{ isAdmin, isDriver, userProfile, refreshProfile }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
