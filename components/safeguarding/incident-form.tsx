"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertTriangle, Shield } from "lucide-react"
import { useCodeWords } from "@/lib/codewords-client"
import { toast } from "@/hooks/use-toast"

interface IncidentFormProps {
  onSubmit: () => void
}

export function IncidentForm({ onSubmit }: IncidentFormProps) {
  const { submitIncidentReport } = useCodeWords()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    incidentType: "",
    severity: "",
    location: "",
    dateTime: "",
    involvedPersons: "",
    description: "",
    immediateActions: "",
    witnessDetails: "",
    isConfidential: false,
    requiresImmediateAction: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log("[v0] Submitting incident report:", formData)
      await submitIncidentReport(formData)
      toast({
        title: "Report Submitted",
        description: "Your incident report has been submitted successfully.",
      })
      onSubmit()
    } catch (error) {
      console.error("[v0] Failed to submit incident report:", error)
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit incident report",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Safeguarding Incident Report</CardTitle>
            <CardDescription>Report safeguarding concerns or incidents securely and confidentially</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Incident Type and Severity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incidentType">Incident Type *</Label>
              <Select
                value={formData.incidentType}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, incidentType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select incident type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical-abuse">Physical Abuse</SelectItem>
                  <SelectItem value="emotional-abuse">Emotional Abuse</SelectItem>
                  <SelectItem value="neglect">Neglect</SelectItem>
                  <SelectItem value="financial-abuse">Financial Abuse</SelectItem>
                  <SelectItem value="sexual-abuse">Sexual Abuse</SelectItem>
                  <SelectItem value="discrimination">Discrimination</SelectItem>
                  <SelectItem value="self-harm">Self Harm</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity Level *</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, severity: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location and Date/Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Where did this incident occur?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTime">Date & Time *</Label>
              <Input
                id="dateTime"
                type="datetime-local"
                value={formData.dateTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, dateTime: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Involved Persons */}
          <div className="space-y-2">
            <Label htmlFor="involvedPersons">Persons Involved *</Label>
            <Textarea
              id="involvedPersons"
              value={formData.involvedPersons}
              onChange={(e) => setFormData((prev) => ({ ...prev, involvedPersons: e.target.value }))}
              placeholder="List all persons involved (names, roles, relationships)"
              className="min-h-[80px]"
              required
            />
          </div>

          {/* Incident Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Provide a detailed account of what happened..."
              className="min-h-[120px]"
              required
            />
          </div>

          {/* Immediate Actions */}
          <div className="space-y-2">
            <Label htmlFor="immediateActions">Immediate Actions Taken</Label>
            <Textarea
              id="immediateActions"
              value={formData.immediateActions}
              onChange={(e) => setFormData((prev) => ({ ...prev, immediateActions: e.target.value }))}
              placeholder="What immediate actions were taken to address the situation?"
              className="min-h-[80px]"
            />
          </div>

          {/* Witness Details */}
          <div className="space-y-2">
            <Label htmlFor="witnessDetails">Witness Information</Label>
            <Textarea
              id="witnessDetails"
              value={formData.witnessDetails}
              onChange={(e) => setFormData((prev) => ({ ...prev, witnessDetails: e.target.value }))}
              placeholder="Names and contact details of any witnesses"
              className="min-h-[80px]"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confidential"
                checked={formData.isConfidential}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isConfidential: checked as boolean }))}
              />
              <Label htmlFor="confidential" className="text-sm">
                This report contains confidential information
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="immediate"
                checked={formData.requiresImmediateAction}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, requiresImmediateAction: checked as boolean }))
                }
              />
              <Label htmlFor="immediate" className="text-sm">
                This incident requires immediate action
              </Label>
            </div>
          </div>

          {/* Warning Notice */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Important Notice</p>
                <p>
                  This report will be securely stored and only accessible to authorized safeguarding personnel. If this
                  is an emergency, please contact emergency services immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white">
              {isSubmitting ? "Submitting Report..." : "Submit Incident Report"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
