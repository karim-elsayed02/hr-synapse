"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarIcon, Upload, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface NewRequestFormProps {
  onSubmit: (requestData: any) => Promise<boolean>
  onCancel: () => void
}

export function NewRequestForm({ onSubmit, onCancel }: NewRequestFormProps) {
  const [requestType, setRequestType] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<string>("normal")
  const [recipientId, setRecipientId] = useState<string>("")
  const [availableRecipients, setAvailableRecipients] = useState<Array<{ id: string; name: string; role: string }>>([])
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [amount, setAmount] = useState("")
  const [receipt, setReceipt] = useState<File | null>(null)
  const [colleague, setColleague] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        const response = await fetch("/api/staff")
        if (response.ok) {
          const staff = await response.json()
          setAvailableRecipients(
            staff.map((member: any) => ({
              id: member.id.toString(),
              name: member.full_name || member.name,
              role: member.position || "Staff Member",
            })),
          )
        }
      } catch (error) {
        console.error("Failed to fetch staff members:", error)
        setAvailableRecipients([])
      }
    }

    fetchStaffMembers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!requestType || !title || !description) {
      setError("Please fill in all required fields")
      return
    }

    if (!recipientId) {
      setError("Please select who to send this request to")
      return
    }

    if (requestType === "leave" && (!startDate || !endDate)) {
      setError("Please select start and end dates for leave request")
      return
    }

    if (requestType === "expense" && !amount) {
      setError("Please enter the expense amount")
      return
    }

    if (requestType === "shift_swap" && !colleague) {
      setError("Please specify the colleague for shift swap")
      return
    }

    try {
      setLoading(true)

      const requestData = {
        type: requestType,
        title,
        description,
        priority,
        recipient_id: recipientId,
        start_date: startDate?.toISOString(),
        end_date: endDate?.toISOString(),
        amount: amount ? Number.parseFloat(amount) : undefined,
        colleague,
        receipt: receipt ? await convertFileToBase64(receipt) : undefined,
      }

      const success = await onSubmit(requestData)
      if (success) {
        setRequestType("")
        setTitle("")
        setDescription("")
        setPriority("normal")
        setRecipientId("")
        setStartDate(undefined)
        setEndDate(undefined)
        setAmount("")
        setReceipt(null)
        setColleague("")
      }
    } catch (error) {
      setError("Failed to submit request. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReceipt(file)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Submit New Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Request Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Request Type *</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leave">Leave Request</SelectItem>
                <SelectItem value="expense">Expense Claim</SelectItem>
                <SelectItem value="shift_swap">Shift Swap</SelectItem>
                <SelectItem value="general">General Request</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recipient Selection */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Send To *</Label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select who to send this request to" />
              </SelectTrigger>
              <SelectContent>
                {availableRecipients.map((recipient) => (
                  <SelectItem key={recipient.id} value={recipient.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{recipient.name}</span>
                      <span className="text-sm text-gray-500">{recipient.role}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of your request"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about your request"
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Leave Request Fields */}
          {requestType === "leave" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                      )}
                      disabled={loading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                      disabled={loading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Expense Request Fields */}
          {requestType === "expense" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (£) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt">Receipt</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("receipt")?.click()}
                    disabled={loading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Receipt
                  </Button>
                  {receipt && <span className="text-sm text-gray-600">{receipt.name}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Shift Swap Fields */}
          {requestType === "shift_swap" && (
            <div className="space-y-2">
              <Label htmlFor="colleague">Colleague to Swap With *</Label>
              <Input
                id="colleague"
                value={colleague}
                onChange={(e) => setColleague(e.target.value)}
                placeholder="Enter colleague's name"
                disabled={loading}
              />
            </div>
          )}

          {/* General Request Fields */}
          {requestType === "general" && (
            <div className="space-y-2">{/* Additional fields for general request can be added here */}</div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
