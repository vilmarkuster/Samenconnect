"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react";
import { getSupabaseClient } from "@/lib/supabase-client";

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setIsAuthenticated(!!data.session);
      })
      .finally(() => {
        setIsLoading(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    // eslint-disable-next-line no-console
    console.log("Attempting Supabase login", { email });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Supabase login error", {
        message: error.message,
        name: error.name,
        status: (error as { status?: number }).status,
      });
      throw new Error(error.message || "Inloggen mislukt.");
    }

    if (!data.session) {
      // eslint-disable-next-line no-console
      console.error("Supabase login: no session in response", { user: data.user?.id });
      throw new Error("Geen sessie ontvangen. Controleer je e-mailbevestiging.");
    }

    // eslint-disable-next-line no-console
    console.log("Supabase login OK", {
      userId: data.session.user.id,
      expiresAt: data.session.expires_at,
    });

    // Sync session to cookies (createBrowserClient) then confirm
    const { data: sessionCheck } = await supabase.auth.getSession();
    // eslint-disable-next-line no-console
    console.log("Session after signIn", { hasSession: !!sessionCheck.session });

    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
