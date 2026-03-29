import { getAllUsers } from "@/lib/actions/admin-actions"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const result = await getAllUsers()

    if (result.success) {
      return NextResponse.json({ success: true, users: result.users })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
