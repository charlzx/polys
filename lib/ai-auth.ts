import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Validate that the request has an authenticated Supabase session.
// Returns null on success (user is authenticated), or a NextResponse error to return.
export async function requireAuth(
  _req: NextRequest
): Promise<NextResponse | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return null;
  } catch {
    return NextResponse.json(
      { error: "Authentication check failed" },
      { status: 401 }
    );
  }
}
