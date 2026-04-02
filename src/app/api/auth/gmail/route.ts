import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { gmailApiClient } from "~/lib/gmail-api";
import { signState } from "~/lib/crypto";

/**
 * GET /api/auth/gmail
 * Initiates the Google OAuth 2.0 flow by redirecting to Google's consent screen.
 * The state parameter is HMAC-signed to prevent tampering.
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.redirect(
        new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Encode userId into the state parameter and sign with HMAC
    const payload = JSON.stringify({ userId, ts: Date.now() });
    const state = signState(payload);
    const authUrl = gmailApiClient.getAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("OAuth initiation error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=oauth_init_failed", process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
}
