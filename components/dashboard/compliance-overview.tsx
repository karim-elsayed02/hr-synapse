"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Clock } from "lucide-react"

interface ComplianceItem {
  id: number
  name: string
  status: "compliant" | "expiring" | "expired"
  expiryDate?: string
  completionRate: number
}

interface ComplianceOverviewProps {
  complianceData: ComplianceItem[]
  overallScore: number
}

export function ComplianceOverview({ complianceData, overallScore }: ComplianceOverviewProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "expiring":
        return <Clock className="h-4 w-4 text-orange-600" />
      case "expired":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "expiring":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "expired":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Compliance Overview
          <Badge variant="outline" className="text-sm">
            {overallScore}% Complete
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Compliance</span>
              <span>{overallScore}%</span>
            </div>
            <Progress value={overallScore} className="h-2" />
          </div>

          <div className="space-y-3">
            {complianceData.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    {item.expiryDate && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {new Date(item.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">{item.completionRate}%</span>
                  <Badge variant="secondary" className={getStatusColor(item.status)}>
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
