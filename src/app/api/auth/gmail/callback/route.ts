import { NextRequest, NextResponse } from "next/server";
import { gmailApiClient } from "~/lib/gmail-api";
import { db } from "~/server/db";
import { encrypt, verifyState } from "~/lib/crypto";

/**
 * GET /api/auth/gmail/callback
 * Handles the OAuth 2.0 callback from Google.
 * Verifies the HMAC-signed state, exchanges the auth code for tokens,
 * encrypts tokens at rest, and creates/updates the email account.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Handle user denying access
  if (error) {
    console.error("OAuth error from Google:", error);
    return NextResponse.redirect(
      new URL(`/dashboard?error=oauth_denied`, appUrl)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/dashboard?error=oauth_missing_params`, appUrl)
    );
  }

  try {
    // Verify HMAC signature on state parameter to prevent tampering
    let stateData: { userId: string; ts: number };
    try {
      const payload = verifyState(state);
      stateData = JSON.parse(payload);
    } catch (stateError) {
      console.error("OAuth state verification failed:", stateError);
      return NextResponse.redirect(
        new URL(`/dashboard?error=oauth_state_invalid`, appUrl)
      );
    }

    const clerkUserId = stateData.userId;

    if (!clerkUserId) {
      throw new Error("Missing userId in state");
    }

    // Reject states older than 10 minutes (replay protection)
    const stateAge = Date.now() - (stateData.ts || 0);
    if (stateAge > 10 * 60 * 1000) {
      console.error("OAuth state expired:", stateAge, "ms old");
      return NextResponse.redirect(
        new URL(`/dashboard?error=oauth_state_expired`, appUrl)
      );
    }

    // Exchange code for tokens
    console.log("🔄 Exchanging auth code for tokens...");
    const tokens = await gmailApiClient.exchangeCodeForTokens(code);

    // Get Gmail profile to find the email address
    console.log("👤 Fetching Gmail profile...");
    const profile = await gmailApiClient.getProfile(tokens.access_token);

    console.log(`📧 Gmail connected: ${profile.emailAddress}`);

    // Find the user in our database
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      throw new Error("User not found in database");
    }

    // Encrypt tokens before storage
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Check if this Gmail account is already connected
    const existingAccount = await db.emailAccount.findFirst({
      where: {
        userId: user.id,
        email: profile.emailAddress,
      },
    });

    if (existingAccount) {
      // Update existing account with new encrypted tokens
      await db.emailAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken || existingAccount.refreshToken,
          tokenExpiresAt,
          isActive: true,
          provider: "gmail",
        },
      });
      console.log("✅ Updated existing Gmail account:", profile.emailAddress);
    } else {
      // Create new account with encrypted tokens
      await db.emailAccount.create({
        data: {
          userId: user.id,
          orengoAccountId: `gmail_oauth_${Date.now()}`,
          email: profile.emailAddress,
          name: profile.emailAddress.split("@")[0] || "Gmail User",
          provider: "gmail",
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
          isActive: true,
        },
      });
      console.log("✅ Created new Gmail account:", profile.emailAddress);
    }

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      new URL(`/dashboard?gmail_connected=true`, appUrl)
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(`/dashboard?error=oauth_callback_failed`, appUrl)
    );
  }
}
