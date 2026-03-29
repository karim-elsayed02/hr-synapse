"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IncidentForm } from "@/components/safeguarding/incident-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Shield } from "lucide-react"
import Link from "next/link"

export default function SafeguardingReportPage() {
  const router = useRouter()
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = () => {
    setIsSubmitted(true)
    setTimeout(() => {
      router.push("/safeguarding")
    }, 3000)
  }

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/safeguarding">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Safeguarding
            </Button>
          </Link>
        </div>

        <Card className="text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Report Submitted Successfully</h2>
            <p className="text-muted-foreground mb-4">
              Your safeguarding report has been securely submitted and will be reviewed by our safeguarding team.
            </p>
            <p className="text-sm text-muted-foreground">
              You will be redirected to the safeguarding dashboard shortly...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/safeguarding">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Safeguarding
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Report Safeguarding Concern</h1>
            <p className="text-muted-foreground">Submit a confidential safeguarding incident report</p>
          </div>
        </div>

        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 dark:text-red-200 text-lg flex items-center gap-2">
              <span>🚨</span>
              Emergency Notice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300 text-sm">
              <strong>
                If this is an emergency requiring immediate attention, please call 999 or contact emergency services
                directly.
              </strong>
              <br />
              For urgent safeguarding concerns outside office hours, contact the Safeguarding Lead: Zara S Khan on +44
              7761 236347 or email Zara.S.Khan@synapseuk.org
            </p>
          </CardContent>
        </Card>
      </div>

      <IncidentForm onSubmit={handleSubmit} />
    </div>
  )
}
