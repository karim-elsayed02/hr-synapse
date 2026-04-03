"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isManagerLikeRole } from "@/lib/utils/permissions";

type AuthUser = {
  id: string;
  email: string | null;
};

type AuthProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  branch: string | null;
  department: string | null;
  phone?: string | null;
  emergency_contact?: string | null;
  branch_id?: string | null;
  profile_picture?: string | null;
};

type LoginInput = {
  email: string;
  password: string;
};

type UpdateProfileInput = Partial<AuthProfile>;

type AuthContextValue = {
  user: AuthUser | null;
  profile: AuthProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  login: (input: LoginInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  updateProfile: (
    updates: UpdateProfileInput
  ) => Promise<{ success: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadProfile(userId: string): Promise<AuthProfile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, branch, department, phone, emergency_contact")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile:", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    email: data.email ?? null,
    full_name: data.full_name ?? null,
    role: data.role ?? "staff",
    branch: data.branch ?? null,
    department: data.department ?? null,
    phone: data.phone ?? null,
    emergency_contact: data.emergency_contact ?? null,
    branch_id: null,
    profile_picture: null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      setLoading(true);

      const supabase = createClient();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        setUser(null);
        setProfile(null);
        return;
      }

      const nextUser: AuthUser = {
        id: session.user.id,
        email: session.user.email ?? null,
      };

      const nextProfile = await loadProfile(session.user.id);

      setUser(nextUser);
      setProfile(
        nextProfile ?? {
          id: session.user.id,
          email: session.user.email ?? null,
          full_name: null,
          role: "staff",
          branch: null,
          department: null,
          phone: null,
          emergency_contact: null,
          branch_id: null,
          profile_picture: null,
        }
      );
    } catch (error) {
      console.error("refreshSession error:", error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const bootstrap = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const fallbackProfile = {
          id: session.user.id,
          email: session.user.email ?? null,
          full_name: null,
          role: "staff",
          branch: null,
          department: null,
          phone: null,
          emergency_contact: null,
          branch_id: null,
          profile_picture: null,
        };

        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
        });
        setProfile(fallbackProfile);
        // Session is ready — do not block UI on profiles row fetch (can hang under RLS/network).
        if (mounted) setLoading(false);

        try {
          const nextProfile = await loadProfile(session.user.id);
          if (!mounted) return;
          setProfile(nextProfile ?? fallbackProfile);
        } catch (profileErr) {
          console.error("Auth bootstrap: profile fetch failed (session still valid):", profileErr);
        }
      } catch (error) {
        console.error("Auth bootstrap error:", error);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const fallbackProfile = {
        id: session.user.id,
        email: session.user.email ?? null,
        full_name: null,
        role: "staff",
        branch: null,
        department: null,
        phone: null,
        emergency_contact: null,
        branch_id: null,
        profile_picture: null,
      };

      setUser({
        id: session.user.id,
        email: session.user.email ?? null,
      });
      setProfile(fallbackProfile);
      setLoading(false);

      try {
        const nextProfile = await loadProfile(session.user.id);
        if (!mounted) return;
        setProfile(nextProfile ?? fallbackProfile);
      } catch (profileErr) {
        console.error("onAuthStateChange: profile fetch failed:", profileErr);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    async ({ email, password }: LoginInput) => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user) {
          return {
            success: false,
            error: error?.message ?? "Login failed",
          };
        }

        const fallbackProfile = {
          id: data.user.id,
          email: data.user.email ?? null,
          full_name: null,
          role: "staff",
          branch: null,
          department: null,
          phone: null,
          emergency_contact: null,
          branch_id: null,
          profile_picture: null,
        };

        setUser({
          id: data.user.id,
          email: data.user.email ?? null,
        });
        setProfile(fallbackProfile);
        setLoading(false);

        try {
          const nextProfile = await loadProfile(data.user.id);
          setProfile(nextProfile ?? fallbackProfile);
        } catch (profileErr) {
          console.error("Login: profile fetch failed:", profileErr);
        }

        router.refresh();

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Login failed",
        };
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    setUser(null);
    setProfile(null);
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name.startsWith("sb-")) {
        document.cookie = `${name}=;expires=Thu,01 Jan 1970 00:00:00 UTC;path=/`;
      }
    });
    try {
      createClient().auth.signOut().catch(() => {});
    } catch { /* ignore */ }
    window.location.href = "/login";
  }, []);

  const updateProfile = useCallback(
    async (updates: UpdateProfileInput) => {
      try {
        if (!user?.id) {
          return { success: false, error: "No authenticated user" };
        }

        const supabase = createClient();

        const payload = {
          full_name: updates.full_name,
          role: updates.role,
          branch: updates.branch,
          department: updates.department,
          phone: updates.phone,
          emergency_contact: updates.emergency_contact,
        };

        const { data, error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", user.id)
          .select("id, email, full_name, role, branch, department, phone, emergency_contact")
          .maybeSingle();

        if (error) {
          return { success: false, error: error.message };
        }

        if (data) {
          setProfile({
            id: data.id,
            email: data.email ?? user.email ?? null,
            full_name: data.full_name ?? null,
            role: data.role ?? "staff",
            branch: data.branch ?? null,
            department: data.department ?? null,
            phone: data.phone ?? null,
            emergency_contact: data.emergency_contact ?? null,
            branch_id: null,
            profile_picture: null,
          });
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update profile",
        };
      }
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAuthenticated: !!user,
      isAdmin: profile?.role === "admin",
      isManager: isManagerLikeRole(profile?.role),
      login,
      logout,
      refreshSession,
      updateProfile,
    }),
    [user, profile, loading, login, logout, refreshSession, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
