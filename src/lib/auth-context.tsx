/**
 * Authentication Context
 * Manages user session, login, logout across the app
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/router";

interface User {
  id: string;
  username: string;
  role: "cashier" | "manager" | "admin";
  full_name: string;
  location_id: string;
}

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  loading: boolean;
  login: (username: string, pin: string) => Promise<boolean | string>; // ← Change this
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: "cashier" | "manager" | "admin") => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const storedSessionId = localStorage.getItem("session_id");

    if (!storedSessionId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/local/auth/me", {
        headers: {
          "x-session-id": storedSessionId,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data);
        setSessionId(storedSessionId);
      } else {
        // Session invalid, clear it
        localStorage.removeItem("session_id");
        setSessionId(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Session check failed:", error);
      localStorage.removeItem("session_id");
    } finally {
      setLoading(false);
    }
  }

  async function login(
    username: string,
    pin: string,
  ): Promise<boolean | string> {
    try {
      const response = await fetch(
        "http://localhost:3000/api/local/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, pin }),
        },
      );

      const data = await response.json();
      console.log("Login Response:", data);

      if (data.success) {
        setUser(data.data.user);
        setSessionId(data.data.session.id);
        localStorage.setItem("session_id", data.data.session.id);
        return true;
      }
      // ✅ FIX: Handle both String AND Object errors
      if (data.error) {
        // If it's the object structure you pasted:
        if (data.error.message) {
          return data.error.message;
        }
        // If it happens to be a simple string:
        if (typeof data.error === "string") {
          return data.error;
        }
      }

      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  }

  async function logout() {
    if (sessionId) {
      try {
        await fetch("http://localhost:3000/api/local/auth/logout", {
          method: "POST",
          headers: {
            "x-session-id": sessionId,
          },
        });
      } catch (error) {
        console.error("Logout request failed:", error);
      }
    }

    // Clear local state
    setUser(null);
    setSessionId(null);
    localStorage.removeItem("session_id");
    router.push("/login");
  }

  function hasRole(requiredRole: "cashier" | "manager" | "admin"): boolean {
    if (!user) return false;

    const roleHierarchy = {
      cashier: 1,
      manager: 2,
      admin: 3,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  const value = {
    user,
    sessionId,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
