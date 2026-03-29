import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

export function LoadingSpinner({ size = "md", text, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  return (
    <div className={cn("flex items-center justify-center min-h-[200px]", className)}>
      <div className="flex items-center space-x-2">
        <Loader2 className={cn("animate-spin text-[#001A3D]", sizeClasses[size])} />
        {text && <span className={cn("text-[#001A3D]/60", textSizeClasses[size])}>{text}</span>}
      </div>
    </div>
  )
}
