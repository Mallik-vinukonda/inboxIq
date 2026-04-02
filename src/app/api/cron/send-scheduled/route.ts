import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { gmailApiClient } from '~/lib/gmail-api';
import { encrypt, decrypt, isEncrypted } from '~/lib/crypto';
import { emailService } from '~/lib/email-service';

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
  if (!account.accessToken) throw new Error("No access token.");
  const decryptedAccessToken = safeDecrypt(account.accessToken);

  const isExpired = account.tokenExpiresAt
    ? new Date(account.tokenExpiresAt).getTime() < Date.now() + 60000
    : false;

  if (!isExpired) return decryptedAccessToken;

  if (!account.refreshToken) throw new Error("Token expired and no refresh token available.");
  const decryptedRefreshToken = safeDecrypt(account.refreshToken);

  const newTokens = await gmailApiClient.refreshAccessToken(decryptedRefreshToken);
  const encryptedAccessToken = encrypt(newTokens.access_token);

  await db.emailAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encryptedAccessToken,
      tokenExpiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
    },
  });

  return newTokens.access_token;
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const now = new Date();
    
    // Find all emails marked as draft (scheduled) that are due to be sent
    const emailsToSend = await db.email.findMany({
      where: {
        isDraft: true,
        isSent: false,
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        account: true,
        addresses: true,
      },
    });

    if (!emailsToSend.length) {
      return NextResponse.json({ success: true, count: 0, message: "No scheduled emails to send." });
    }

    let successCount = 0;
    let failCount = 0;

    for (const email of emailsToSend) {
      try {
        const to = email.addresses.filter(a => a.type === 'to').map(a => ({ name: a.name || undefined, address: a.address }));
        const cc = email.addresses.filter(a => a.type === 'cc').map(a => ({ name: a.name || undefined, address: a.address }));
        const bcc = email.addresses.filter(a => a.type === 'bcc').map(a => ({ name: a.name || undefined, address: a.address }));

        let resultId = email.orengoMessageId;

        if (email.account.refreshToken) {
          const accessToken = await getValidAccessToken(email.account);
          const gmailResult = await gmailApiClient.sendMessage(
            accessToken,
            to,
            email.subject || "",
            email.body || "",
            {
              from: { name: email.account.name || undefined, address: email.account.email },
              cc: cc.length > 0 ? cc : undefined,
              bcc: bcc.length > 0 ? bcc : undefined,
            }
          );
          resultId = gmailResult.id;
        } else {
          // Fallback legacy service
          const result = await emailService.sendEmail({
            to,
            cc,
            bcc,
            subject: email.subject || "",
            body: email.body || "",
            from: { name: email.account.name || undefined, address: email.account.email }
          });
          resultId = result.id;
        }

        // Update database record
        await db.email.update({
          where: { id: email.id },
          data: {
            isSent: true,
            isDraft: false,
            sentAt: new Date(),
            orengoMessageId: resultId,
          }
        });

        successCount++;
      } catch (err) {
        console.error(`Failed to send scheduled email ${email.id}:`, err);
        failCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: successCount, 
      failed: failCount,
      message: `Sent ${successCount} emails, failed ${failCount}.` 
    });

  } catch (error) {
    console.error('Error in send-scheduled cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
