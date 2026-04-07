"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Legacy component – uploads are now handled by the dialog on /documents.
 * Redirects immediately.
 */
export function UploadDocumentForm() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/documents");
  }, [router]);
  return null;
}
