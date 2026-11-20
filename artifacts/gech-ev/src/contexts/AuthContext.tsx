import { createContext, useContext, useState, type ReactNode } from "react";

export interface User {
  telegramId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

export interface AuthContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "gech:user_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    try {
      if (newUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        if (newUser.phone) {
          localStorage.setItem("gech:last_phone", newUser.phone);
        }
        if (newUser.telegramId) {
          localStorage.setItem("gech:last_telegram_id", newUser.telegramId);
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  };

  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
