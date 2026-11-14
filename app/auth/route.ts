
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");

  // Keep redirect destinations fixed for security.
  const successUrl = new URL("/student/pending", origin);
  const errorUrl = new URL("/register?error=confirmation", origin);

  if (!code) {
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Email confirmation failed:", error.message);
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(successUrl);
}
