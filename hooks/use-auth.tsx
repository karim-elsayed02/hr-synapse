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
  avatar_path?: string | null;
  hourly_rate?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
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

  const result = await Promise.race([
    supabase
      .from("profiles")
      .select(
        "id, email, full_name, role, branch, department, phone, emergency_contact, avatar_path, hourly_rate, created_at, updated_at"
      )
      .eq("id", userId)
      .maybeSingle(),
    new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "Profile load timed out" } }), 5000)
    ),
  ]);

  const { data, error } = result;

  if (error) {
    console.error("Failed to load profile:", error);
    return null;
  }

  if (!data) return null;

  const row = data as {
    avatar_path?: string | null;
    hourly_rate?: number | string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };

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
    avatar_path: row.avatar_path ?? null,
    hourly_rate:
      row.hourly_rate != null ? Number(row.hourly_rate) : null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
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
          avatar_path: null,
          hourly_rate: null,
          created_at: null,
          updated_at: null,
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
    let bootstrapDone = false;
    let currentUserId: string | null = null;
    const supabase = createClient();

    const makeFallback = (u: { id: string; email?: string | null }): AuthProfile => ({
      id: u.id,
      email: u.email ?? null,
      full_name: null,
      role: "staff",
      branch: null,
      department: null,
      phone: null,
      emergency_contact: null,
      branch_id: null,
      avatar_path: null,
      hourly_rate: null,
      created_at: null,
      updated_at: null,
    });

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

        currentUserId = session.user.id;

        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
        });

        try {
          const nextProfile = await loadProfile(session.user.id);
          if (!mounted) return;
          setProfile(nextProfile ?? makeFallback(session.user));
        } catch (profileErr) {
          console.error("Auth bootstrap: profile fetch failed:", profileErr);
          if (mounted) setProfile(makeFallback(session.user));
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
          bootstrapDone = true;
        }
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "INITIAL_SESSION") return;

      if (event === "TOKEN_REFRESHED" && session?.user?.id === currentUserId) return;

      if (!session?.user) {
        currentUserId = null;
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (session.user.id === currentUserId && bootstrapDone) return;

      currentUserId = session.user.id;

      setUser({
        id: session.user.id,
        email: session.user.email ?? null,
      });

      try {
        const nextProfile = await loadProfile(session.user.id);
        if (mounted) setProfile(nextProfile ?? makeFallback(session.user));
      } catch {
        if (mounted) setProfile(makeFallback(session.user));
      } finally {
        if (mounted) setLoading(false);
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

        setUser({
          id: data.user.id,
          email: data.user.email ?? null,
        });

        const nextProfile = await loadProfile(data.user.id);
        setProfile(
          nextProfile ?? {
            id: data.user.id,
            email: data.user.email ?? null,
            full_name: null,
            role: "staff",
            branch: null,
            department: null,
            phone: null,
            emergency_contact: null,
            branch_id: null,
            avatar_path: null,
            hourly_rate: null,
            created_at: null,
            updated_at: null,
          }
        );
        setLoading(false);

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

        const payload = Object.fromEntries(
          Object.entries({
            full_name: updates.full_name,
            role: updates.role,
            branch: updates.branch,
            department: updates.department,
            phone: updates.phone,
            emergency_contact: updates.emergency_contact,
            avatar_path: updates.avatar_path,
          }).filter(([, v]) => v !== undefined)
        );

        const { data, error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", user.id)
          .select(
            "id, email, full_name, role, branch, department, phone, emergency_contact, avatar_path, hourly_rate, created_at, updated_at"
          )
          .maybeSingle();

        if (error) {
          return { success: false, error: error.message };
        }

        if (data) {
          const row = data as {
            created_at?: string | null;
            updated_at?: string | null;
          };
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
            avatar_path: data.avatar_path ?? null,
            hourly_rate:
              data.hourly_rate != null && !Number.isNaN(Number(data.hourly_rate))
                ? Number(data.hourly_rate)
                : null,
            created_at: row.created_at ?? null,
            updated_at: row.updated_at ?? null,
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
