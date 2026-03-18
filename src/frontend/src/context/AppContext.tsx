import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { getBackend } from "../utils/backendSingleton";

interface AppContextType {
  isAdmin: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getBackend()
      .then((b) => b.isCallerAdmin())
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, []);

  return (
    <AppContext.Provider value={{ isAdmin }}>{children}</AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
