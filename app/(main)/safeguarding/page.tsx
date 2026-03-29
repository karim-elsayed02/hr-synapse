"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { IncidentForm } from "@/components/safeguarding/incident-form"
import { CaseManagement } from "@/components/safeguarding/case-management"
import { useAuth } from "@/hooks/use-auth"
import { getSafeguardingStatsAction } from "@/lib/actions/safeguarding-actions"
import { Loader2 } from "lucide-react"

export default function SafeguardingPage() {
  const { user } = useAuth()
  const [showIncidentForm, setShowIncidentForm] = useState(false)
  const [stats, setStats] = useState({
    openCases: 0,
    thisMonthCases: 0,
    resolvedCases: 0,
    avgResponseTime: "0h",
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const canViewCases = user?.role === "admin" || user?.role === "manager"

  useEffect(() => {
    const loadStats = async () => {
      if (canViewCases) {
        try {
          const statsData = await getSafeguardingStatsAction()
          setStats(statsData)
        } catch (error) {
          console.error("Failed to load safeguarding stats:", error)
        }
      }
      setIsLoadingStats(false)
    }

    loadStats()
  }, [canViewCases])

  const handleIncidentSubmitted = () => {
    setShowIncidentForm(false)
    if (canViewCases) {
      getSafeguardingStatsAction().then(setStats).catch(console.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <span className="text-2xl">🛡️</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Safeguarding</h1>
            <p className="text-muted-foreground">Report and manage safeguarding concerns securely</p>
          </div>
        </div>

        <Dialog open={showIncidentForm} onOpenChange={setShowIncidentForm}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <span className="mr-2">➕</span>
              Report Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Safeguarding Report</DialogTitle>
            </DialogHeader>
            <IncidentForm onSubmit={handleIncidentSubmitted} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Cases</p>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin text-blue-600 inline" /> : stats.openCases}
                </p>
              </div>
              <span className="text-2xl">⚠️</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 inline" />
                  ) : (
                    stats.thisMonthCases
                  )}
                </p>
              </div>
              <span className="text-2xl">📄</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 inline" />
                  ) : (
                    stats.resolvedCases
                  )}
                </p>
              </div>
              <span className="text-2xl">👥</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Response</p>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 inline" />
                  ) : (
                    stats.avgResponseTime
                  )}
                </p>
              </div>
              <span className="text-2xl">⏰</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {canViewCases && <TabsTrigger value="cases">Case Management</TabsTrigger>}
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Emergency Contacts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>⚠️</span>
                  Emergency Contacts
                </CardTitle>
                <CardDescription>Important contacts for immediate safeguarding concerns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <h4 className="font-semibold text-red-800 dark:text-red-200">Emergency Services</h4>
                  <p className="text-red-700 dark:text-red-300 text-lg font-mono">999</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Safeguarding Lead</h4>
                  <p className="text-blue-700 dark:text-blue-300">Zara S Khan</p>
                  <p className="text-blue-700 dark:text-blue-300">Zara.S.Khan@synapseuk.org</p>
                  <p className="text-blue-700 dark:text-blue-300">+44 7761 236347</p>
                </div>
              </CardContent>
            </Card>

            {/* Reporting Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>📄</span>
                  Reporting Guidelines
                </CardTitle>
                <CardDescription>Key steps for reporting safeguarding concerns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium">Immediate Safety</h4>
                      <p className="text-sm text-muted-foreground">Ensure immediate safety of all involved</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">Document Everything</h4>
                      <p className="text-sm text-muted-foreground">Record all details accurately and objectively</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium">Report Promptly</h4>
                      <p className="text-sm text-muted-foreground">Submit report within 24 hours</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium">Follow Up</h4>
                      <p className="text-sm text-muted-foreground">Cooperate with investigation process</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {canViewCases && (
          <TabsContent value="cases">
            <CaseManagement />
          </TabsContent>
        )}

        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Safeguarding Policy</CardTitle>
                <CardDescription>Current safeguarding policies and procedures</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => window.open("https://www.synapseuk.org/safeguarding", "_blank")}
                >
                  <span className="mr-2">🔗</span>
                  View Policy
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
