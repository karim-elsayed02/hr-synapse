"use client"

import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface GeneralSettings {
  platformName: string
  supportEmail: string
  maintenanceMode: boolean
}

interface UserSettings {
  allowSelfRegistration: boolean
  requireEmailVerification: boolean
  sessionTimeout: number
}

interface SecuritySettings {
  twoFactorAuth: boolean
  passwordComplexity: boolean
  maxLoginAttempts: number
}

interface NotificationSettings {
  emailNotifications: boolean
  adminEmail: string
}

export default function SettingsPage() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    platformName: "SynapseUK Staff Platform",
    supportEmail: "support@synapseuk.org",
    maintenanceMode: false,
  })

  const [userSettings, setUserSettings] = useState<UserSettings>({
    allowSelfRegistration: false,
    requireEmailVerification: true,
    sessionTimeout: 24,
  })

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorAuth: false,
    passwordComplexity: true,
    maxLoginAttempts: 5,
  })

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    adminEmail: "admin@synapseuk.org",
  })

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (user && !isAdmin) {
      router.push("/dashboard")
    }
  }, [user, isAdmin, router])

  const saveGeneralSettings = async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Saving general settings:", generalSettings)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "Settings Saved",
        description: "General settings have been updated successfully.",
      })
    } catch (error) {
      console.error("[v0] Error saving general settings:", error)
      toast({
        title: "Error",
        description: "Failed to save general settings.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveUserSettings = async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Saving user settings:", userSettings)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "Settings Saved",
        description: "User management settings have been updated successfully.",
      })
    } catch (error) {
      console.error("[v0] Error saving user settings:", error)
      toast({
        title: "Error",
        description: "Failed to save user settings.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveSecuritySettings = async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Saving security settings:", securitySettings)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "Settings Saved",
        description: "Security settings have been updated successfully.",
      })
    } catch (error) {
      console.error("[v0] Error saving security settings:", error)
      toast({
        title: "Error",
        description: "Failed to save security settings.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveNotificationSettings = async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Saving notification settings:", notificationSettings)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "Settings Saved",
        description: "Notification settings have been updated successfully.",
      })
    } catch (error) {
      console.error("[v0] Error saving notification settings:", error)
      toast({
        title: "Error",
        description: "Failed to save notification settings.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Loading Settings...</h2>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage platform-wide settings and configurations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input
                id="platform-name"
                value={generalSettings.platformName}
                onChange={(e) => setGeneralSettings((prev) => ({ ...prev, platformName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-email">Support Email</Label>
              <Input
                id="support-email"
                type="email"
                value={generalSettings.supportEmail}
                onChange={(e) => setGeneralSettings((prev) => ({ ...prev, supportEmail: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enable to restrict access during maintenance</p>
              </div>
              <Switch
                checked={generalSettings.maintenanceMode}
                onCheckedChange={(checked) => setGeneralSettings((prev) => ({ ...prev, maintenanceMode: checked }))}
              />
            </div>
            <Button onClick={saveGeneralSettings} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save General Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* User Management Settings */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Self Registration</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">Let users create their own accounts</p>
              </div>
              <Switch
                checked={userSettings.allowSelfRegistration}
                onCheckedChange={(checked) => setUserSettings((prev) => ({ ...prev, allowSelfRegistration: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Email Verification</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">Users must verify email before access</p>
              </div>
              <Switch
                checked={userSettings.requireEmailVerification}
                onCheckedChange={(checked) =>
                  setUserSettings((prev) => ({ ...prev, requireEmailVerification: checked }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session Timeout (hours)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={userSettings.sessionTimeout}
                onChange={(e) =>
                  setUserSettings((prev) => ({ ...prev, sessionTimeout: Number.parseInt(e.target.value) || 24 }))
                }
                min="1"
                max="168"
              />
            </div>
            <Button onClick={saveUserSettings} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save User Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">Require 2FA for admin accounts</p>
              </div>
              <Switch
                checked={securitySettings.twoFactorAuth}
                onCheckedChange={(checked) => setSecuritySettings((prev) => ({ ...prev, twoFactorAuth: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Password Complexity</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enforce strong password requirements</p>
              </div>
              <Switch
                checked={securitySettings.passwordComplexity}
                onCheckedChange={(checked) => setSecuritySettings((prev) => ({ ...prev, passwordComplexity: checked }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
              <Input
                id="max-login-attempts"
                type="number"
                value={securitySettings.maxLoginAttempts}
                onChange={(e) =>
                  setSecuritySettings((prev) => ({ ...prev, maxLoginAttempts: Number.parseInt(e.target.value) || 5 }))
                }
                min="3"
                max="10"
              />
            </div>
            <Button onClick={saveSecuritySettings} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Security Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">Send system notifications via email</p>
              </div>
              <Switch
                checked={notificationSettings.emailNotifications}
                onCheckedChange={(checked) =>
                  setNotificationSettings((prev) => ({ ...prev, emailNotifications: checked }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Alert Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={notificationSettings.adminEmail}
                onChange={(e) => setNotificationSettings((prev) => ({ ...prev, adminEmail: e.target.value }))}
              />
            </div>
            <Button onClick={saveNotificationSettings} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Notification Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Platform Version</Label>
              <p className="text-gray-900 dark:text-white">v1.0.0</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Updated</Label>
              <p className="text-gray-900 dark:text-white">2024-01-15</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Environment</Label>
              <Badge variant="secondary">Production</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
