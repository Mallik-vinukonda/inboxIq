import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';
import { gmailApiClient } from '~/lib/gmail-api';
import { getAuth } from '@clerk/nextjs/server';
import { decrypt, isEncrypted } from '~/lib/crypto';

// Re-use logic to safely get access token
function safeDecrypt(value: string): string {
  if (isEncrypted(value)) {
    try {
      return decrypt(value);
    } catch {
      return value;
    }
  }
  return value;
}

async function getValidAccessToken(
  account: { id: string; accessToken: string | null; refreshToken: string | null; tokenExpiresAt: Date | null },
): Promise<string> {
  if (!account.accessToken) throw new Error("No access token found.");
  const decryptedAccessToken = safeDecrypt(account.accessToken);

  const isExpired = account.tokenExpiresAt
    ? new Date(account.tokenExpiresAt).getTime() < Date.now() + 60000
    : false;

  if (!isExpired) return decryptedAccessToken;

  if (!account.refreshToken) throw new Error("Token expired and no refresh token available.");
  const decryptedRefreshToken = safeDecrypt(account.refreshToken);

  const newTokens = await gmailApiClient.refreshAccessToken(decryptedRefreshToken);
  
  // Note: we'd ideally save the new token, but in an edge route/API it's okay to just use it
  return newTokens.access_token;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string; attachmentId: string } }
) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { messageId, attachmentId } = await params;

    // Find user
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        accounts: true,
      },
    });

    if (!user || user.accounts.length === 0) {
      return new NextResponse('No connected email accounts', { status: 404 });
    }

    // Attempt to download using the first available account 
    // (Assuming the email belongs to this account. If you support multi-account strictly, 
    // you might need to pass accountId as a query param)
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename') || 'attachment';
    const mimeType = url.searchParams.get('mimeType') || 'application/octet-stream';
    const accountId = url.searchParams.get('accountId');

    const account = accountId 
      ? user.accounts.find(a => a.id === accountId) 
      : user.accounts[0];

    if (!account) {
      return new NextResponse('Account not found', { status: 404 });
    }

    const accessToken = await getValidAccessToken(account);
    const attachmentData = await gmailApiClient.getAttachment(accessToken, messageId, attachmentId);
    
    // Gmail API returns Base64url format
    const buffer = Buffer.from(attachmentData.data, 'base64url');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
