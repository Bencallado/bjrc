
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");

  const successUrl = new URL("/reset-password", origin);
  const errorUrl = new URL("/forgot-password?error=recovery", origin);

  if (!code) {
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Password recovery callback failed:", error.message);
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(successUrl);
}
