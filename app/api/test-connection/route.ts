import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        message: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
        status: "error",
      })
    }

    // Test basic connection to Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseKey,
      },
    })

    if (response.ok) {
      return NextResponse.json({
        message: "Supabase connection successful!",
        status: "success",
        url: supabaseUrl,
      })
    } else {
      return NextResponse.json({
        message: `Connection failed with status: ${response.status}`,
        status: "error",
      })
    }
  } catch (error) {
    console.error("Connection test error:", error)
    return NextResponse.json({
      message: "Connection test failed: " + (error as Error).message,
      status: "error",
    })
  }
}
