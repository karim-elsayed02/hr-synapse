import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Mail, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">Email Verification Failed</CardTitle>
          <CardDescription className="text-gray-600">There was a problem verifying your email address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p>This could happen if:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The verification link has expired</li>
              <li>The link has already been used</li>
              <li>There was a network error</li>
            </ul>
          </div>

          <div className="space-y-3 pt-4">
            <Button asChild className="w-full">
              <Link href="/login">
                <Mail className="mr-2 h-4 w-4" />
                Try Signing In
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full bg-transparent">
              <Link href="/register">
                <RefreshCw className="mr-2 h-4 w-4" />
                Request New Verification
              </Link>
            </Button>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-500">
              Need help?{" "}
              <a href="mailto:admin@synapseuk.org" className="text-blue-600 hover:text-blue-500">
                Contact support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
