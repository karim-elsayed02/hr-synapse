"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { NewRequestForm } from "@/components/requests/new-request-form"
import { useCodeWords } from "@/lib/codewords-client"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function NewRequestPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { createRequest } = useCodeWords()
  const { toast } = useToast()

  const handleSubmit = async (requestData: any) => {
    try {
      const mappedData = {
        type: requestData.type,
        title: requestData.title,
        description: requestData.description,
        priority: requestData.priority,
        sendTo: requestData.recipient_id,
        startDate: requestData.start_date,
        endDate: requestData.end_date,
        expenseAmount: requestData.amount,
        swapWith: requestData.colleague,
        receipt: requestData.receipt,
        requester_id: user?.id,
        status: "pending",
      }

      const response = await createRequest(mappedData)

      if (response.success) {
        toast({
          title: "Request submitted",
          description: "Your request is pending approval.",
          variant: "default",
          duration: 5000,
        })

        setTimeout(() => {
          router.push("/requests")
        }, 2000)

        return true
      } else {
        const errorMessage = response.error || "Failed to submit request. Please try again."
        toast({
          title: "Request failed",
          description: errorMessage,
          variant: "destructive",
          duration: 10000,
        })
        return false
      }
    } catch (error) {
      console.error("Error creating request:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 10000,
      })
      return false
    }
  }

  const handleCancel = () => {
    router.push("/requests")
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/requests">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        </Link>
      </div>

      <NewRequestForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  )
}
