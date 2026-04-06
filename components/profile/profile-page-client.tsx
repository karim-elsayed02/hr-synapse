"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Camera,
  Briefcase,
  AtSign,
  Shield,
  Building2,
  ArrowLeft,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createBrowserClient } from "@supabase/ssr";
import { formatBranchLabel, formatSubBranchLabel } from "@/lib/utils/org-structure";
import { getAvatarUrl } from "@/lib/utils/avatar";

function roleLabel(role: string | null) {
  const r = role ?? "staff";
  if (r === "admin") return "Admin";
  if (r === "branch_lead") return "Branch lead";
  if (r === "sub_branch_lead") return "Sub-branch lead";
  return "Staff";
}

export type PublicProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  branch: string | null;
  department: string | null;
  phone: string | null;
  emergency_contact: string | null;
  avatar_path: string | null;
  hourly_rate: number | string | null;
  created_at: string | null;
  updated_at?: string | null;
};

type AuthProfileShape = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  branch: string | null;
  department: string | null;
  phone?: string | null;
  emergency_contact?: string | null;
  avatar_path?: string | null;
  hourly_rate?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function mapAuthToPublic(p: AuthProfileShape): PublicProfile {
  return {
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    role: p.role,
    branch: p.branch,
    department: p.department,
    phone: p.phone ?? null,
    emergency_contact: p.emergency_contact ?? null,
    avatar_path: p.avatar_path ?? null,
    hourly_rate: p.hourly_rate ?? null,
    created_at: p.created_at ?? null,
    updated_at: p.updated_at ?? null,
  };
}

function getInitials(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return "SU";
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function fmtGbpHourly(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);
}

function hourlyToInput(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "";
  return String(n);
}

type SectionId = "general" | "contact" | "org" | "security";

export function ProfilePageClient({ profileId }: { profileId?: string }) {
  const { user, profile: authProfile, loading: authLoading, isAdmin, refreshSession } =
    useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emergency, setEmergency] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<SectionId>("general");

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const [hourlyRateInput, setHourlyRateInput] = useState("");

  const resolvedId = profileId ?? user?.id ?? null;
  const isOwn = !!(user && resolvedId && resolvedId === user.id);
  /** Only admins may change their own hourly rate (matches server + DB role). */
  const canEditOwnHourlyRate = isOwn && authProfile?.role === "admin";

  const applyFormFromPublic = useCallback((json: PublicProfile) => {
    setFullName(json.full_name?.trim() ?? "");
    setPhone(json.phone ?? "");
    setEmergency(json.emergency_contact ?? "");
    setAvatarPath(json.avatar_path ?? null);
    setBio("");
    setHourlyRateInput(hourlyToInput(json.hourly_rate));
  }, []);

  const loadOtherUserProfile = useCallback(async () => {
    if (!resolvedId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/profile/${resolvedId}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        setData(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      const json = (await res.json()) as PublicProfile;
      setData(json);
      applyFormFromPublic(json);
    } catch {
      setNotFound(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [resolvedId, applyFormFromPublic]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    if (isOwn) {
      if (!authProfile) {
        setLoading(false);
        setNotFound(true);
        setData(null);
        return;
      }
      const pub = mapAuthToPublic(authProfile);
      setData(pub);
      setNotFound(false);
      applyFormFromPublic(pub);
      setLoading(false);
      return;
    }

    void loadOtherUserProfile();
  }, [
    authLoading,
    user,
    isOwn,
    authProfile,
    router,
    loadOtherUserProfile,
    applyFormFromPublic,
  ]);

  const displayName = useMemo(() => {
    return data?.full_name?.trim() || user?.email?.split("@")[0] || "Member";
  }, [data?.full_name, user?.email]);

  const completion = useMemo(() => {
    const p = data;
    if (!p) return 0;
    const fields = [p.full_name, p.phone, p.branch, p.department, p.emergency_contact];
    const done = fields.filter((f) => f && String(f).trim()).length;
    return Math.round((done / fields.length) * 100);
  }, [data]);

  const scrollTo = (id: SectionId) => {
    setActiveSection(id);
    document.getElementById(`profile-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEdit = () => {
    if (!data) return;
    setFullName(data.full_name?.trim() ?? "");
    setPhone(data.phone ?? "");
    setEmergency(data.emergency_contact ?? "");
    setAvatarPath(data.avatar_path ?? null);
    setHourlyRateInput(hourlyToInput(data.hourly_rate));
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user || !isOwn) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          emergency_contact: emergency.trim() || null,
          avatar_path: avatarPath,
          ...(canEditOwnHourlyRate
            ? { hourly_rate: hourlyRateInput.trim() === "" ? null : hourlyRateInput.trim() }
            : {}),
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Save failed");
      }
      setIsEditing(false);
      toast({ title: "Saved", description: "Your profile has been updated." });
      await refreshSession();
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload-profile-picture", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");
      setAvatarPath(result.avatar_path);
      toast({ title: "Photo updated", description: "Your avatar has been saved." });
      await refreshSession();
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Could not upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleChangePassword = async () => {
    if (pwdNew !== pwdConfirm) {
      toast({ title: "Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (pwdNew.length < 6) {
      toast({ title: "Too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    setPwdLoading(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error } = await supabase.auth.updateUser({ password: pwdNew });
      if (error) throw error;
      toast({ title: "Password updated" });
      setPwdNew("");
      setPwdConfirm("");
      setPwdOpen(false);
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setPwdLoading(false);
    }
  };

  const showHourly =
    isOwn || isAdmin;

  if (authLoading || (loading && !data && !notFound)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#001A3D]/20 border-t-[#FFB84D]" />
      </div>
    );
  }

  if (!user) return null;

  if (notFound || !data) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="font-display text-xl font-semibold text-[#001A3D]">Profile not found</p>
        <p className="mt-2 text-sm text-[#001A3D]/55">This person may not exist or you don&apos;t have access.</p>
        <Link
          href="/staff"
          className="mt-6 inline-flex rounded-full bg-[#001A3D] px-5 py-2 text-sm font-semibold text-white"
        >
          Back to directory
        </Link>
      </div>
    );
  }

  const memberSince = data.created_at
    ? new Date(data.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : null;

  const navBtn = (id: SectionId, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => scrollTo(id)}
      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
        activeSection === id
          ? "bg-[#001A3D] text-white"
          : "bg-white text-[#001A3D]/80 hover:bg-[#f8f9fa]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      {!isOwn && (
        <Link
          href="/staff"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#001A3D]/70 hover:text-[#001A3D]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to directory
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#001A3D]/45">
            Directory <span className="text-[#001A3D]/30">›</span>{" "}
            {isOwn ? "My profile" : "Profile"}
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-[#001A3D] sm:text-4xl">
            {isOwn ? "Edit profile" : displayName}
          </h1>
          <p className="mt-2 text-sm text-[#001A3D]/55">
            {isOwn
              ? "Managing settings & security"
              : `${roleLabel(data.role)} · ${formatBranchLabel(data.branch)}`}
          </p>
        </div>
        {isOwn && (
          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[#001A3D]/20"
                  onClick={cancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-full bg-[#FFB84D] font-semibold text-[#291800] hover:bg-[#f5a84a]"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving…" : "Save changes"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="rounded-full bg-[#001A3D] text-white hover:bg-[#011b3e]"
                onClick={() => setIsEditing(true)}
              >
                Edit profile
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left column */}
        <aside className="space-y-6 lg:col-span-4">
          <div className="curator-card overflow-hidden p-6 shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="h-28 w-28 ring-4 ring-white shadow-md">
                  <AvatarImage
                    src={getAvatarUrl(avatarPath) || undefined}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-[#001A3D] to-[#011b3e] text-2xl font-semibold text-[#FFB84D]">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                {isOwn && isEditing && (
                  <button
                    type="button"
                    className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#FFB84D] text-[#291800] shadow-md transition hover:bg-[#f5a84a]"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    aria-label="Change photo"
                  >
                    {isUploading ? <Upload className="h-4 w-4 animate-pulse" /> : <Camera className="h-4 w-4" />}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              <p className="font-display mt-4 text-xl font-semibold text-[#001A3D]">{displayName}</p>
              {memberSince && (
                <p className="mt-1 text-xs text-[#001A3D]/45">Staff member since {memberSince}</p>
              )}
            </div>

            <nav className="mt-8 space-y-2">
              {navBtn("general", "General information")}
              {navBtn("contact", "Contact details")}
              {navBtn("org", "Organisation")}
              {isOwn && navBtn("security", "Security")}
            </nav>
          </div>

          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#001A3D] to-[#011b3e] p-6 text-white shadow-[0_8px_24px_rgba(0,26,61,0.12)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FFB84D]/90">
              Profile strength
            </p>
            <p className="font-display mt-2 text-3xl font-semibold">{completion}%</p>
            <p className="mt-1 text-sm text-white/70">
              {completion >= 100 ? "Complete" : "Almost complete"}
            </p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4DB8FF] to-teal-400 transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/60">
              Add phone and emergency contact to improve your profile completeness.
            </p>
          </div>
        </aside>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-8">
          <section id="profile-section-general" className="curator-card p-6 shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
            <div className="mb-6 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#4DB8FF]" />
              <h2 className="font-display text-lg font-semibold text-[#001A3D]">General information</h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              {isOwn && isEditing ? (
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  placeholder="As it should appear across the platform"
                  className="h-11 rounded-xl border-0 bg-[#f3f4f5] focus-visible:ring-2 focus-visible:ring-[#FFB84D]/40"
                />
              ) : (
                <p className="rounded-xl bg-[#f3f4f5] px-3 py-2.5 text-sm text-[#001A3D]">
                  {data.full_name?.trim() || "—"}
                </p>
              )}
            </div>
            <div className="mt-6 space-y-2">
              <Label>Professional bio</Label>
              {isOwn && isEditing ? (
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short bio (optional — not saved yet)"
                  rows={4}
                  className="rounded-xl border-[#001A3D]/10 bg-[#f8f9fa]"
                  disabled
                />
              ) : (
                <p className="rounded-xl bg-[#f8f9fa] px-3 py-3 text-sm text-[#001A3D]/55">—</p>
              )}
              {isOwn && isEditing && (
                <p className="text-xs text-[#001A3D]/40">Bio sync coming soon.</p>
              )}
            </div>
            {showHourly && (
              <div className="mt-6 space-y-2">
                <Label htmlFor="hourlyRate">Hourly rate (GBP)</Label>
                {canEditOwnHourlyRate && isEditing ? (
                  <Input
                    id="hourlyRate"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={hourlyRateInput}
                    onChange={(e) => setHourlyRateInput(e.target.value)}
                    placeholder="e.g. 15.50"
                    className="h-11 rounded-xl border-0 bg-[#f3f4f5] focus-visible:ring-2 focus-visible:ring-[#FFB84D]/40"
                  />
                ) : (
                  <p className="rounded-xl bg-[#f3f4f5] px-3 py-2.5 text-sm font-medium text-[#001A3D]">
                    {fmtGbpHourly(data.hourly_rate)}
                  </p>
                )}
                <p className="text-xs text-[#001A3D]/40">
                  {canEditOwnHourlyRate
                    ? isEditing
                      ? "Per hour before tax. Saved with your profile."
                      : "Click Edit profile to change your rate."
                    : isOwn
                      ? "Only administrators can change this. Ask an admin or use Staff Directory if you manage staff."
                      : "Visible to you as an administrator."}
                </p>
              </div>
            )}
          </section>

          <section id="profile-section-contact" className="curator-card p-6 shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
            <div className="mb-6 flex items-center gap-2">
              <AtSign className="h-5 w-5 text-[#4DB8FF]" />
              <h2 className="font-display text-lg font-semibold text-[#001A3D]">Contact details</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Work email</Label>
                <p className="rounded-xl bg-[#f3f4f5] px-3 py-2.5 text-sm text-[#001A3D]">{data.email || "—"}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                {isOwn && isEditing ? (
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 rounded-xl border-0 bg-[#f3f4f5]"
                  />
                ) : (
                  <p className="rounded-xl bg-[#f3f4f5] px-3 py-2.5 text-sm">{data.phone || "—"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency">Emergency contact</Label>
                {isOwn && isEditing ? (
                  <Input
                    id="emergency"
                    value={emergency}
                    onChange={(e) => setEmergency(e.target.value)}
                    className="h-11 rounded-xl border-0 bg-[#f3f4f5]"
                  />
                ) : (
                  <p className="rounded-xl bg-[#f3f4f5] px-3 py-2.5 text-sm">{data.emergency_contact || "—"}</p>
                )}
              </div>
            </div>
          </section>

          <section id="profile-section-org" className="curator-card p-6 shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
            <div className="mb-6 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#4DB8FF]" />
              <h2 className="font-display text-lg font-semibold text-[#001A3D]">Organisation</h2>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl bg-[#f8f9fa] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#001A3D]/45">Role</p>
                <p className="mt-1 text-sm font-medium text-[#001A3D]">{roleLabel(data.role)}</p>
              </div>
              <div className="rounded-xl bg-[#f8f9fa] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#001A3D]/45">Branch</p>
                <p className="mt-1 text-sm text-[#001A3D]/85">{formatBranchLabel(data.branch)}</p>
              </div>
              <div className="rounded-xl bg-[#f8f9fa] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#001A3D]/45">Sub-branch</p>
                <p className="mt-1 text-sm text-[#001A3D]/85">{formatSubBranchLabel(data.department)}</p>
              </div>
              <p className="text-xs text-[#001A3D]/40">Branch and sub-branch are assigned by administrators.</p>
            </div>
          </section>

          {isOwn && (
            <section id="profile-section-security" className="curator-card p-6 shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
              <div className="mb-6 flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#4DB8FF]" />
                <h2 className="font-display text-lg font-semibold text-[#001A3D]">Security</h2>
              </div>
              <div className="rounded-xl bg-[#f8f9fa] px-4 py-4">
                <p className="text-sm font-medium text-[#001A3D]">Password</p>
                <p className="mt-1 text-xs text-[#001A3D]/45">Use a strong password you don&apos;t use elsewhere.</p>
                <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="mt-3 rounded-full border-[#001A3D]/15">
                      Change password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl border-[#001A3D]/10">
                    <DialogHeader>
                      <DialogTitle>Change password</DialogTitle>
                      <DialogDescription>Enter a new password for your account.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div className="space-y-2">
                        <Label>New password</Label>
                        <Input
                          type="password"
                          value={pwdNew}
                          onChange={(e) => setPwdNew(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm password</Label>
                        <Input
                          type="password"
                          value={pwdConfirm}
                          onChange={(e) => setPwdConfirm(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setPwdOpen(false)} className="rounded-full">
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        className="rounded-full bg-[#001A3D]"
                        onClick={handleChangePassword}
                        disabled={pwdLoading}
                      >
                        {pwdLoading ? "Updating…" : "Update password"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </section>
          )}
        </div>
      </div>

    </div>
  );
}
