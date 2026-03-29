"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, Clock, User, AlertTriangle, Eye } from "lucide-react"
import { useCodeWords } from "@/lib/codewords-client"
import { useAuth } from "@/hooks/use-auth"

interface SafeguardingCase {
  id: string
  incidentType: string
  severity: "low" | "medium" | "high" | "critical"
  status: "open" | "investigating" | "resolved" | "closed"
  reportedBy: string
  reportedDate: string
  assignedTo?: string
  location: string
  description: string
  lastUpdated: string
}

export function CaseManagement() {
  const { user } = useAuth()
  const { getSafeguardingCases, updateCaseStatus } = useCodeWords()
  const [cases, setCases] = useState<SafeguardingCase[]>([])
  const [filteredCases, setFilteredCases] = useState<SafeguardingCase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")

  useEffect(() => {
    loadCases()
  }, [])

  useEffect(() => {
    filterCases()
  }, [cases, searchTerm, statusFilter, severityFilter])

  const loadCases = async () => {
    try {
      const data = await getSafeguardingCases()
      setCases(data)
    } catch (error) {
      console.error("Failed to load safeguarding cases:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterCases = () => {
    let filtered = cases

    if (searchTerm) {
      filtered = filtered.filter(
        (case_) =>
          case_.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          case_.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          case_.reportedBy.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((case_) => case_.status === statusFilter)
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter((case_) => case_.severity === severityFilter)
    }

    setFilteredCases(filtered)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "investigating":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading safeguarding cases...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Safeguarding Case Management</h2>
            <p className="text-muted-foreground">Monitor and manage safeguarding incidents</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input placeholder="Search cases..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {filteredCases.length} cases
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      <div className="grid gap-4">
        {filteredCases.map((case_) => (
          <Card key={case_.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Case #{case_.id}</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {case_.incidentType.replace("-", " ")} • {case_.location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getSeverityColor(case_.severity)}>{case_.severity.toUpperCase()}</Badge>
                  <Badge className={getStatusColor(case_.status)}>{case_.status.toUpperCase()}</Badge>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{case_.description}</p>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Reported by {case_.reportedBy}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(case_.reportedDate).toLocaleDateString()}</span>
                  </div>
                  {case_.assignedTo && (
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span>Assigned to {case_.assignedTo}</span>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm">
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCases.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No cases found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" || severityFilter !== "all"
                  ? "Try adjusting your filters to see more cases."
                  : "No safeguarding cases have been reported yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
