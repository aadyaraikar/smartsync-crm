import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const services = {
    openai: process.env.OPENAI_API_KEY ? "connected" : "error",
    supabase: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL ? "connected" : "error",
    email: process.env.RESEND_API_KEY ? "connected" : "error",
  } as const;

  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    services,
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
