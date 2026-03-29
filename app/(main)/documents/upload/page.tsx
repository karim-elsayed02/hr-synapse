import type { Metadata } from "next"
import { UploadDocumentForm } from "@/components/documents/upload-document-form"

export const metadata: Metadata = {
  title: "Upload Document - SynapseUK Staff Platform",
  description: "Upload new documents to the staff platform",
}

export default function UploadDocumentPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Document</h1>
          <p className="text-gray-600 mt-2">
            Upload a new document to the staff platform. All uploaded documents will be reviewed and processed.
          </p>
        </div>

        <UploadDocumentForm />
      </div>
    </div>
  )
}
