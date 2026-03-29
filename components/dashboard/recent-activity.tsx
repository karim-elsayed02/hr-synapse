"use client"

import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Activity {
  id: string
  type: "request" | "task" | "announcement" | "safeguarding" | "document"
  title: string
  user: string
  timestamp: string
  status?: string
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="curator-card p-6">
      <h3 className="font-display text-lg font-semibold tracking-tight text-[#001A3D]">Recent activity</h3>
      <p className="mt-1 text-sm text-[#001A3D]/55">Latest updates across your organisation</p>

      <div className="mt-6 space-y-4">
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#001A3D]/45">No recent activity</p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-[#f8f9fa]"
            >
              <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                <AvatarFallback className="bg-gradient-to-br from-[#001A3D] to-[#011b3e] text-xs font-medium text-[#FFB84D]">
                  {activity.user.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-[#001A3D]">
                  <span className="font-medium">{activity.user}</span>{" "}
                  <span className="text-[#001A3D]/70">{activity.title}</span>
                </p>
                <p className="mt-1 text-xs text-[#001A3D]/45">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
