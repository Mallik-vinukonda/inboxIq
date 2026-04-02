import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { emailService } from "~/lib/email-service";
import { gmailApiClient } from "~/lib/gmail-api";
import { encrypt, decrypt, isEncrypted } from "~/lib/crypto";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Safely decrypt a token value.
 * If the value is already plaintext (legacy/migration), return it as-is.
 */
function safeDecrypt(value: string): string {
  if (isEncrypted(value)) {
    try {
      return decrypt(value);
    } catch {
      // If decryption fails, assume it's a plaintext legacy token
      console.warn("⚠️ Token decryption failed, using value as plaintext (legacy token?)");
      return value;
    }
  }
  return value;
}

// Helper: Get a valid access token for an account, refreshing if needed
async function getValidAccessToken(
  account: { id: string; accessToken: string | null; refreshToken: string | null; tokenExpiresAt: Date | null },
  db: any
): Promise<string> {
  if (!account.accessToken) {
    throw new Error("No access token found. Please reconnect your Gmail account.");
  }

  // Decrypt the stored access token
  const decryptedAccessToken = safeDecrypt(account.accessToken);

  // Check if token is expired (or will expire in next 60 seconds)
  const isExpired = account.tokenExpiresAt
    ? new Date(account.tokenExpiresAt).getTime() < Date.now() + 60000
    : false;

  if (!isExpired) {
    return decryptedAccessToken;
  }

  // Token is expired — refresh it
  if (!account.refreshToken) {
    throw new Error("Token expired and no refresh token available. Please reconnect your Gmail account.");
  }

  const decryptedRefreshToken = safeDecrypt(account.refreshToken);

  console.log("🔄 Refreshing expired access token...");
  const newTokens = await gmailApiClient.refreshAccessToken(decryptedRefreshToken);

  // Encrypt new tokens before storing in database
  const encryptedAccessToken = encrypt(newTokens.access_token);

  // Update the database with encrypted tokens
  await db.emailAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encryptedAccessToken,
      tokenExpiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
      // refresh_token is only returned on first authorization, keep existing
    },
  });

  return newTokens.access_token;
}

export const accountRouter = createTRPCRouter({
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    try {
      let user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
        include: {
          accounts: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!user) {
        // Create user if not exists (fallback if webhook didn't work)
        try {
          const clerk = await clerkClient();
          const clerkUser = await clerk.users.getUser(ctx.auth.userId);
          if (!clerkUser) {
            console.log('No Clerk user found for ID:', ctx.auth.userId);
            return [];
          }

          user = await ctx.db.user.create({
            data: {
              clerkId: ctx.auth.userId,
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              firstName: clerkUser.firstName,
              lastName: clerkUser.lastName,
              imageUrl: clerkUser.imageUrl,
            },
            include: {
              accounts: {
                orderBy: { createdAt: "desc" },
              },
            },
          });
        } catch (createError) {
          console.error('Error creating user:', createError);
          return [];
        }
      }

      return user?.accounts || [];
    } catch (error) {
      console.error('Error in getAccounts:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }),

  // connectAccount is now handled via OAuth API routes (/api/auth/gmail)
  // This mutation is kept for checking account connection status
  connectAccount: protectedProcedure
    .input(z.object({
      provider: z.enum(["gmail"]),
      email: z.string().email().optional(),
      password: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // OAuth flow is handled by /api/auth/gmail routes
      // This endpoint now just returns a redirect instruction
      return {
        success: false,
        requiresOAuth: true,
        message: "Please use the 'Sign in with Google' button to connect your Gmail account."
      };
    }),

  getEmails: protectedProcedure
    .input(z.object({
      accountId: z.string(),
      folder: z.string().default("inbox"),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const whereClause: any = {
        account: {
          id: input.accountId,
          userId: user.id,
        },
      };

      // Filter by folder type
      if (input.folder === "sent") {
        whereClause.isSent = true;
        whereClause.isDeleted = false;
      } else if (input.folder === "starred") {
        whereClause.isStarred = true;
        whereClause.isDeleted = false;
        whereClause.isArchived = false;
      } else if (input.folder === "archive") {
        whereClause.isArchived = true;
        whereClause.isDeleted = false;
      } else if (input.folder === "trash") {
        whereClause.isDeleted = true;
      } else if (input.folder === "inbox") {
        whereClause.isSent = false;
        whereClause.isArchived = false;
        whereClause.isDeleted = false;
      }

      const emails = await ctx.db.email.findMany({
        where: whereClause,
        include: {
          addresses: true,
          thread: true,
        },
        orderBy: { sentAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (emails.length > input.limit) {
        const nextItem = emails.pop();
        nextCursor = nextItem!.id;
      }

      return {
        emails,
        nextCursor,
      };
    }),

  getThread: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.thread.findUnique({
        where: { id: input.threadId },
        include: {
          emails: {
            include: {
              addresses: true,
              attachments: true,
            },
            orderBy: { sentAt: "asc" },
          },
        },
      });
    }),

  getEmailById: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return ctx.db.email.findFirst({
        where: {
          id: input.emailId,
          account: {
            userId: user.id,
          },
        },
        include: {
          addresses: true,
          attachments: true,
          thread: true,
        },
      });
    }),

  searchEmails: protectedProcedure
    .input(z.object({
      query: z.string(),
      accountId: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const emails = await ctx.db.email.findMany({
        where: {
          AND: [
            input.accountId ? { accountId: input.accountId } : {},
            {
              account: {
                userId: user.id,
              },
            },
            {
              OR: [
                { subject: { contains: input.query, mode: 'insensitive' } },
                { body: { contains: input.query, mode: 'insensitive' } },
                { bodySnippet: { contains: input.query, mode: 'insensitive' } },
              ],
            },
          ],
        },
        include: {
          addresses: true,
          thread: true,
        },
        orderBy: { sentAt: "desc" },
        take: input.limit,
      });

      return emails;
    }),

  sendEmail: protectedProcedure
    .input(z.object({
      accountId: z.string(),
      to: z.array(z.object({
        name: z.string().optional(),
        address: z.string().email(),
      })),
      cc: z.array(z.object({
        name: z.string().optional(),
        address: z.string().email(),
      })).optional(),
      bcc: z.array(z.object({
        name: z.string().optional(),
        address: z.string().email(),
      })).optional(),
      subject: z.string(),
      body: z.string(),
      threadId: z.string().optional(),
      scheduledAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('🚀 Starting sendEmail mutation');

      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const emailAccount = await ctx.db.emailAccount.findFirst({
        where: {
          id: input.accountId,
          userId: user.id,
        },
      });

      if (!emailAccount) {
        throw new Error("Email account not found");
      }

      console.log('📧 Sending from:', emailAccount.email);

      try {
        let resultId: string;
        const isScheduled = Boolean(input.scheduledAt && new Date(input.scheduledAt) > new Date());

        // If it's scheduled, don't send right now via Gmail API
        if (isScheduled) {
          resultId = `scheduled-${Date.now()}`;
          console.log('⏳ Email scheduled for later:', input.scheduledAt);
        } else {
          // Use Gmail API if account has OAuth tokens
          if (emailAccount.refreshToken) {
            const accessToken = await getValidAccessToken(emailAccount, ctx.db);
  
            const gmailResult = await gmailApiClient.sendMessage(
            accessToken,
            input.to,
            input.subject,
            input.body,
            {
              from: { name: emailAccount.name || undefined, address: emailAccount.email },
              cc: input.cc,
              bcc: input.bcc,
            }
          );
          resultId = gmailResult.id;
          console.log('✅ Email sent via Gmail API:', resultId);
          } else {
            // Fallback to legacy email service (Nodemailer/Resend)
            const result = await emailService.sendEmail({
              to: input.to,
              cc: input.cc,
              bcc: input.bcc,
              subject: input.subject,
              body: input.body,
              from: {
                name: emailAccount.name || undefined,
                address: emailAccount.email,
              },
            });
            resultId = result.id;
            console.log('✅ Email sent via legacy service:', resultId);
          }
        }

        // Validate threadId if provided
        let validThreadId: string | null = null;
        if (input.threadId) {
          const thread = await ctx.db.thread.findFirst({
            where: {
              id: input.threadId,
              accountId: emailAccount.id,
            },
          });
          if (thread) {
            validThreadId = input.threadId;
          }
        }

        // Store sent (or scheduled) email in database
        const sentEmail = await ctx.db.email.create({
          data: {
            accountId: emailAccount.id,
            threadId: validThreadId,
            orengoMessageId: resultId,
            subject: input.subject,
            body: input.body,
            bodySnippet: input.body.replace(/<[^>]*>/g, '').substring(0, 150),
            isRead: true,
            isSent: !isScheduled,
            isDraft: isScheduled, // Mark as draft until it's actually sent
            sentAt: isScheduled ? null : new Date(),
            scheduledAt: isScheduled ? new Date(input.scheduledAt!) : null,
            addresses: {
              create: [
                {
                  type: "from",
                  name: emailAccount.name || undefined,
                  address: emailAccount.email,
                },
                ...input.to.map((addr) => ({
                  type: "to" as const,
                  name: addr.name || undefined,
                  address: addr.address,
                })),
                ...(input.cc || []).map((addr) => ({
                  type: "cc" as const,
                  name: addr.name || undefined,
                  address: addr.address,
                })),
                ...(input.bcc || []).map((addr) => ({
                  type: "bcc" as const,
                  name: addr.name || undefined,
                  address: addr.address,
                })),
              ],
            },
          },
          include: {
            addresses: true,
          },
        });

        return { success: true, emailId: sentEmail.id };
      } catch (error) {
        console.error('❌ SendEmail error:', error);
        throw error;
      }
    }),

  markAsRead: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      await ctx.db.email.update({
        where: {
          id: input.emailId,
          account: {
            userId: user.id,
          },
        },
        data: { isRead: true },
      });

      return { success: true };
    }),

  toggleStar: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const email = await ctx.db.email.findUnique({
        where: {
          id: input.emailId,
          account: {
            userId: user.id,
          },
        },
      });

      if (!email) {
        throw new Error("Email not found");
      }

      const updatedEmail = await ctx.db.email.update({
        where: { id: input.emailId },
        data: { isStarred: !email.isStarred },
      });

      return { success: true, isStarred: updatedEmail.isStarred };
    }),

  syncEmails: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log('🔄 Starting email sync for user:', ctx.auth.userId);

      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found. Please try signing out and signing back in.");
      }

      const emailAccount = await ctx.db.emailAccount.findFirst({
        where: {
          id: input.accountId,
          userId: user.id,
        },
      });

      if (!emailAccount) {
        throw new Error("Email account not found. Please reconnect your Gmail account.");
      }

      if (emailAccount.provider !== "gmail" || !emailAccount.accessToken) {
        throw new Error("Gmail account not properly configured. Please reconnect your Gmail account.");
      }

      console.log('📧 Starting Gmail API sync for:', emailAccount.email);

      try {
        // Get valid access token (auto-refreshes if expired)
        const accessToken = await getValidAccessToken(emailAccount, ctx.db);

        let syncedCount = 0;

        // Helper to store a parsed Gmail API email
        const storeEmail = async (parsedEmail: any) => {
          try {
            // Primary dedup check using formal messageId
            let isDuplicate = false;
            
            const existingById = await ctx.db.email.findFirst({
              where: {
                accountId: emailAccount.id,
                orengoMessageId: parsedEmail.messageId,
              },
            });
            
            if (existingById) isDuplicate = true;
            
            // Secondary dedup check for sent emails (our 'sendEmail' mutation uses a different ID structure)
            if (!isDuplicate && parsedEmail.isSent) {
              const existingSent = await ctx.db.email.findFirst({
                where: {
                  accountId: emailAccount.id,
                  isSent: true,
                  subject: parsedEmail.subject,
                  // We could check time here, but subject + isSent is usually unique enough for a quick sync
                }
              });
              if (existingSent) isDuplicate = true;
            }

            if (!isDuplicate) {
              await ctx.db.email.create({
                data: {
                  accountId: emailAccount.id,
                  orengoMessageId: parsedEmail.messageId,
                  subject: parsedEmail.subject,
                  body: parsedEmail.body,
                  bodySnippet: parsedEmail.snippet,
                  isRead: parsedEmail.isRead,
                  isImportant: parsedEmail.isImportant,
                  isStarred: parsedEmail.isStarred,
                  isDraft: parsedEmail.isDraft,
                  isSent: parsedEmail.isSent,
                  sentAt: parsedEmail.sentAt,
                  receivedAt: parsedEmail.receivedAt,
                  addresses: {
                    create: [
                      {
                        type: "from",
                        name: parsedEmail.from.name || undefined,
                        address: parsedEmail.from.address,
                      },
                      ...parsedEmail.to.map((addr: any) => ({
                        type: "to" as const,
                        name: addr.name || undefined,
                        address: addr.address,
                      })),
                      ...(parsedEmail.cc || []).map((addr: any) => ({
                        type: "cc" as const,
                        name: addr.name || undefined,
                        address: addr.address,
                      })),
                    ],
                  },
                  attachments: parsedEmail.attachments?.length ? {
                    create: parsedEmail.attachments.map((att: any) => ({
                      filename: att.filename,
                      mimeType: att.mimeType,
                      size: att.size,
                      contentId: att.attachmentId,
                    })),
                  } : undefined,
                },
              });

              syncedCount++;
            }
          } catch (error) {
            console.error(`Error storing email ${parsedEmail.id}:`, error);
          }
        };

        // Fetch inbox emails via Gmail API
        console.log('📬 Fetching inbox emails via Gmail API...');
        const inboxList = await gmailApiClient.listMessages(
          accessToken,
          "in:inbox",
          100
        );

        let totalFetched = 0;
        for (const msg of inboxList.messages) {
          try {
            const fullMsg = await gmailApiClient.getMessage(accessToken, msg.id);
            const parsed = gmailApiClient.parseMessage(fullMsg);
            await storeEmail(parsed);
            totalFetched++;
          } catch (err) {
            console.error(`Error fetching message ${msg.id}:`, err);
          }
        }
        console.log(`📬 Processed ${totalFetched} inbox emails`);

        // Fetch sent emails
        try {
          console.log('📤 Fetching sent emails via Gmail API...');
          const sentList = await gmailApiClient.listMessages(
            accessToken,
            "in:sent",
            50
          );

          for (const msg of sentList.messages) {
            try {
              const fullMsg = await gmailApiClient.getMessage(accessToken, msg.id);
              const parsed = gmailApiClient.parseMessage(fullMsg);
              // Force isSent flag
              parsed.isSent = true;
              await storeEmail(parsed);
            } catch (err) {
              console.error(`Error fetching sent message ${msg.id}:`, err);
            }
          }
        } catch (sentError) {
          console.warn("⚠️ Could not fetch sent emails:", sentError);
        }

        // Update last sync time
        await ctx.db.emailAccount.update({
          where: { id: emailAccount.id },
          data: { lastSyncAt: new Date() },
        });

        console.log(`✅ Email sync completed: ${syncedCount} new emails`);

        return {
          success: true,
          syncedCount,
          totalEmails: totalFetched,
          message: `Synced ${syncedCount} new emails`,
        };
      } catch (error) {
        console.error("Gmail API sync error:", error);
        throw new Error(`Failed to sync Gmail account: ${error}`);
      }
    }),

  deleteAccount: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const emailAccount = await ctx.db.emailAccount.findFirst({
        where: {
          id: input.accountId,
          userId: user.id,
        },
      });

      if (!emailAccount) {
        throw new Error("Email account not found");
      }

      // Delete all emails associated with this account
      await ctx.db.email.deleteMany({
        where: { accountId: input.accountId },
      });

      // Delete the email account
      await ctx.db.emailAccount.delete({
        where: { id: input.accountId },
      });

      return {
        success: true,
        message: `Account ${emailAccount.email} deleted successfully`
      };
    }),

  archiveEmail: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const email = await ctx.db.email.findFirst({
        where: {
          id: input.emailId,
          account: {
            userId: user.id,
          },
        },
      });

      if (!email) {
        throw new Error("Email not found");
      }

      await ctx.db.email.update({
        where: { id: input.emailId },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      return { success: true, message: "Email archived successfully" };
    }),

  unarchiveEmail: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const email = await ctx.db.email.findFirst({
        where: {
          id: input.emailId,
          account: {
            userId: user.id,
          },
        },
      });

      if (!email) {
        throw new Error("Email not found");
      }

      await ctx.db.email.update({
        where: { id: input.emailId },
        data: {
          isArchived: false,
          archivedAt: null,
        },
      });

      return { success: true, message: "Email moved to inbox" };
    }),

  moveToTrash: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const email = await ctx.db.email.findFirst({
        where: {
          id: input.emailId,
          account: {
            userId: user.id,
          },
        },
      });

      if (!email) {
        throw new Error("Email not found");
      }

      await ctx.db.email.update({
        where: { id: input.emailId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      return { success: true, message: "Email moved to trash" };
    }),

  restoreFromTrash: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const email = await ctx.db.email.findFirst({
        where: {
          id: input.emailId,
          account: {
            userId: user.id,
          },
        },
      });

      if (!email) {
        throw new Error("Email not found");
      }

      await ctx.db.email.update({
        where: { id: input.emailId },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      return { success: true, message: "Email restored from trash" };
    }),

  permanentlyDeleteEmail: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const email = await ctx.db.email.findFirst({
        where: {
          id: input.emailId,
          account: {
            userId: user.id,
          },
          isDeleted: true, // Only allow permanent deletion of trashed emails
        },
      });

      if (!email) {
        throw new Error("Email not found or not in trash");
      }

      // Delete email addresses first (foreign key constraint)
      await ctx.db.emailAddress.deleteMany({
        where: { emailId: input.emailId },
      });

      // Delete attachments if any
      await ctx.db.emailAttachment.deleteMany({
        where: { emailId: input.emailId },
      });

      // Delete the email
      await ctx.db.email.delete({
        where: { id: input.emailId },
      });

      return { success: true, message: "Email permanently deleted" };
    }),

  emptyTrash: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const emailAccount = await ctx.db.emailAccount.findFirst({
        where: {
          id: input.accountId,
          userId: user.id,
        },
      });

      if (!emailAccount) {
        throw new Error("Email account not found");
      }

      // Get all trashed emails for this account
      const trashedEmails = await ctx.db.email.findMany({
        where: {
          accountId: input.accountId,
          isDeleted: true,
        },
        select: { id: true },
      });

      const emailIds = trashedEmails.map(email => email.id);

      if (emailIds.length === 0) {
        return { success: true, message: "Trash is already empty", deletedCount: 0 };
      }

      // Delete email addresses
      await ctx.db.emailAddress.deleteMany({
        where: { emailId: { in: emailIds } },
      });

      // Delete attachments
      await ctx.db.emailAttachment.deleteMany({
        where: { emailId: { in: emailIds } },
      });

      // Delete emails
      const result = await ctx.db.email.deleteMany({
        where: {
          id: { in: emailIds },
        },
      });

      return {
        success: true,
        message: `Permanently deleted ${result.count} emails from trash`,
        deletedCount: result.count,
      };
    }),

  // ─── Unread Counts for Sidebar Badges ─────────────────────────────────────
  getUnreadCounts: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.auth.userId },
      });

      if (!user) return { inbox: 0, starred: 0, sent: 0 };

      const baseWhere = {
        accountId: input.accountId,
        account: { userId: user.id },
      };

      const [inboxUnread, starredCount, sentCount] = await Promise.all([
        ctx.db.email.count({
          where: {
            ...baseWhere,
            isRead: false,
            isSent: false,
            isArchived: false,
            isDeleted: false,
          },
        }),
        ctx.db.email.count({
          where: {
            ...baseWhere,
            isStarred: true,
            isDeleted: false,
          },
        }),
        ctx.db.email.count({
          where: {
            ...baseWhere,
            isSent: true,
            isDeleted: false,
          },
        }),
      ]);

      return {
        inbox: inboxUnread,
        starred: starredCount,
        sent: sentCount,
      };
    }),
});