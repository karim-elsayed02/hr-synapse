"use client";

import type React from "react";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Edit, Save, X, Upload, Shield, Building2, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createBrowserClient } from "@supabase/ssr";

type EditableProfile = {
  full_name: string;
  phone: string;
  emergency_contact: string;
};

function getInitials(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return "SU";

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function displayValue(value?: string | null, empty = "—") {
  if (!value || !value.trim()) return empty;
  return value;
}

export default function ProfilePage() {
  const { user, profile, loading, updateProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profilePicture, setProfilePicture] = useState("");
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [editData, setEditData] = useState<EditableProfile>({
    full_name: "",
    phone: "",
    emergency_contact: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!profile) return;

    setEditData({
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      emergency_contact: profile.emergency_contact || "",
    });
    setProfilePicture(profile.profile_picture || "");
  }, [profile]);

  const displayName = useMemo(() => {
    return profile?.full_name?.trim() || user?.email?.split("@")[0] || "SynapseUK User";
  }, [profile?.full_name, user?.email]);

  const completion = useMemo(() => {
    const fields = [
      profile?.full_name,
      profile?.phone,
      profile?.branch,
      profile?.department,
      profile?.emergency_contact,
    ];

    const completed = fields.filter((field) => field && field.trim()).length;
    return Math.round((completed / fields.length) * 100);
  }, [
    profile?.full_name,
    profile?.phone,
    profile?.branch,
    profile?.department,
    profile?.emergency_contact,
  ]);

  const handleEditToggle = () => {
    if (isEditing && profile) {
      setEditData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        emergency_contact: profile.emergency_contact || "",
      });
      setProfilePicture(profile.profile_picture || "");
    }

    setIsEditing((prev) => !prev);
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const result = await updateProfile({
        ...editData,
        profile_picture: profilePicture,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to save profile");
      }

      setIsEditing(false);

      toast({
        title: "Profile updated",
        description: "Your personal details have been saved successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update profile. Please try again.",
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

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setProfilePicture(result.url);

      toast({
        title: "Picture uploaded",
        description: "Your profile picture has been uploaded.",
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to upload profile picture.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });

      setPasswordData({
        newPassword: "",
        confirmPassword: "",
      });
      setIsChangePasswordOpen(false);
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "Password change failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Loading profile...
          </h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayData = {
    email: profile?.email || user.email || "",
    full_name: profile?.full_name || "",
    role: profile?.role || "staff",
    phone: profile?.phone || "",
    branch: profile?.branch || "",
    department: profile?.department || "",
    emergency_contact: profile?.emergency_contact || "",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Profile
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage your personal information and account security.
          </p>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleEditToggle} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={handleEditToggle}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Profile completion
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {completion}%
              </p>
            </div>
            <div className="w-full md:max-w-md">
              <Progress value={completion} className="h-3" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Complete your contact details. Branch and department are assigned by SynapseUK.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profilePicture || undefined} alt="Profile picture" />
                  <AvatarFallback className="text-lg">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>

                {isEditing && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Upload className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileUpload}
                className="hidden"
              />

              {isEditing && (
                <p className="text-center text-sm text-gray-500">
                  Upload JPG, PNG, WEBP, or GIF under 5MB.
                </p>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="full_name"
                    value={editData.full_name}
                    onChange={(e) =>
                      setEditData({ ...editData, full_name: e.target.value })
                    }
                    placeholder="Enter your full name"
                    className="mt-2"
                  />
                ) : (
                  <p className="mt-2 text-gray-900 dark:text-white">
                    {displayValue(displayData.full_name, "— Add your name")}
                  </p>
                )}
              </div>

              <div>
                <Label>Email</Label>
                <p className="mt-2 text-gray-900 dark:text-white">
                  {displayValue(displayData.email)}
                </p>
              </div>

              <div>
                <Label>Role</Label>
                <div className="mt-2">
                  <Badge variant="secondary" className="capitalize">
                    {displayData.role}
                  </Badge>
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={editData.phone}
                    onChange={(e) =>
                      setEditData({ ...editData, phone: e.target.value })
                    }
                    placeholder="Enter your phone number"
                    className="mt-2"
                  />
                ) : (
                  <p className="mt-2 text-gray-900 dark:text-white">
                    {displayValue(displayData.phone, "— Add phone number")}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                {isEditing ? (
                  <Input
                    id="emergency_contact"
                    value={editData.emergency_contact}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        emergency_contact: e.target.value,
                      })
                    }
                    placeholder="Enter emergency contact details"
                    className="mt-2"
                  />
                ) : (
                  <p className="mt-2 text-gray-900 dark:text-white">
                    {displayValue(
                      displayData.emergency_contact,
                      "— Add emergency contact"
                    )}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organisation Details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Branch
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {displayValue(displayData.branch, "Not assigned yet")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Briefcase className="mt-0.5 h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Department
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {displayValue(displayData.department, "Not assigned yet")}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                These details are managed by SynapseUK administrators.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 text-gray-500" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Password
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Update your password for account security.
                    </p>

                    <Dialog
                      open={isChangePasswordOpen}
                      onOpenChange={setIsChangePasswordOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" className="mt-3 bg-transparent">
                          Change Password
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Change Password</DialogTitle>
                          <DialogDescription>
                            Enter a new password for your account.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                              id="new-password"
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) =>
                                setPasswordData({
                                  ...passwordData,
                                  newPassword: e.target.value,
                                })
                              }
                              placeholder="Enter new password"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="confirm-password">
                              Confirm New Password
                            </Label>
                            <Input
                              id="confirm-password"
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) =>
                                setPasswordData({
                                  ...passwordData,
                                  confirmPassword: e.target.value,
                                })
                              }
                              placeholder="Confirm new password"
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setPasswordData({
                                newPassword: "",
                                confirmPassword: "",
                              });
                              setIsChangePasswordOpen(false);
                            }}
                            disabled={isChangingPassword}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleChangePassword}
                            disabled={isChangingPassword}
                          >
                            {isChangingPassword ? "Changing..." : "Change Password"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Account Email
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {displayValue(displayData.email)}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Role Access
                </h3>
                <div className="mt-2">
                  <Badge variant="secondary" className="capitalize">
                    {displayData.role}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
