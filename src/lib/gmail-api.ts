import { env } from "~/env";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  mimeType: string;
  headers?: GmailMessageHeader[];
  body?: { data?: string; size: number; attachmentId?: string };
  parts?: GmailMessagePart[];
  filename?: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: GmailMessageHeader[];
    mimeType: string;
    body?: { data?: string; size: number };
    parts?: GmailMessagePart[];
  };
  internalDate: string;
  sizeEstimate: number;
}

export interface ParsedEmail {
  id: string;
  messageId: string;
  threadId: string;
  subject: string;
  body: string;
  snippet: string;
  from: { name?: string; address: string };
  to: Array<{ name?: string; address: string }>;
  cc: Array<{ name?: string; address: string }>;
  bcc: Array<{ name?: string; address: string }>;
  sentAt: Date;
  receivedAt: Date;
  isRead: boolean;
  isImportant: boolean;
  isStarred: boolean;
  isDraft: boolean;
  isSent: boolean;
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId?: string;
  }>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

// ─── Gmail API Client ────────────────────────────────────────────────────────

class GmailApiClient {
  /**
   * Generate the Google OAuth consent URL for account linking.
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline", // get refresh_token
      prompt: "consent", // always show consent for refresh_token
      state,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange an authorization code for access + refresh tokens.
   */
  async exchangeCodeForTokens(code: string): Promise<GmailTokens> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Token exchange failed:", error);
      throw new Error("Failed to exchange authorization code for tokens");
    }

    return res.json() as Promise<GmailTokens>;
  }

  /**
   * Refresh an expired access token using the stored refresh token.
   */
  async refreshAccessToken(refreshToken: string): Promise<GmailTokens> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Token refresh failed:", error);
      throw new Error("Failed to refresh access token");
    }

    return res.json() as Promise<GmailTokens>;
  }

  /**
   * Get the authenticated user's Gmail profile.
   */
  async getProfile(accessToken: string): Promise<GmailProfile> {
    const res = await fetch(`${GMAIL_API_BASE}/users/me/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error("Failed to get Gmail profile");
    }

    return res.json() as Promise<GmailProfile>;
  }

  /**
   * List message IDs from Gmail (paginated).
   */
  async listMessages(
    accessToken: string,
    query: string = "",
    maxResults: number = 50,
    pageToken?: string
  ): Promise<{
    messages: Array<{ id: string; threadId: string }>;
    nextPageToken?: string;
    resultSizeEstimate: number;
  }> {
    const params = new URLSearchParams({
      maxResults: String(maxResults),
    });

    if (query) params.set("q", query);
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `${GMAIL_API_BASE}/users/me/messages?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error("List messages failed:", error);
      throw new Error("Failed to list Gmail messages");
    }

    const data = await res.json();
    return {
      messages: data.messages || [],
      nextPageToken: data.nextPageToken,
      resultSizeEstimate: data.resultSizeEstimate || 0,
    };
  }

  /**
   * Get full message content by ID.
   */
  async getMessage(
    accessToken: string,
    messageId: string
  ): Promise<GmailMessage> {
    const res = await fetch(
      `${GMAIL_API_BASE}/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Failed to get message ${messageId}`);
    }

    return res.json() as Promise<GmailMessage>;
  }

  /**
   * Get an attachment by ID for a specific message.
   */
  async getAttachment(
    accessToken: string,
    messageId: string,
    attachmentId: string
  ): Promise<{ data: string; size: number }> {
    const res = await fetch(
      `${GMAIL_API_BASE}/users/me/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error("Get attachment failed:", error);
      throw new Error(`Failed to get attachment ${attachmentId}`);
    }

    return res.json() as Promise<{ data: string; size: number }>;
  }

  /**
   * Send an email via the Gmail API.
   * Takes a raw RFC 2822 message and base64url-encodes it.
   */
  async sendMessage(
    accessToken: string,
    to: Array<{ name?: string; address: string }>,
    subject: string,
    body: string,
    options?: {
      from?: { name?: string; address: string };
      cc?: Array<{ name?: string; address: string }>;
      bcc?: Array<{ name?: string; address: string }>;
      threadId?: string;
      inReplyTo?: string;
    }
  ): Promise<{ id: string; threadId: string }> {
    // Build RFC 2822 email
    const formatAddr = (a: { name?: string; address: string }) =>
      a.name ? `"${a.name}" <${a.address}>` : a.address;

    const headers: string[] = [
      `To: ${to.map(formatAddr).join(", ")}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
    ];

    if (options?.from) {
      headers.unshift(`From: ${formatAddr(options.from)}`);
    }
    if (options?.cc?.length) {
      headers.push(`Cc: ${options.cc.map(formatAddr).join(", ")}`);
    }
    if (options?.bcc?.length) {
      headers.push(`Bcc: ${options.bcc.map(formatAddr).join(", ")}`);
    }
    if (options?.inReplyTo) {
      headers.push(`In-Reply-To: ${options.inReplyTo}`);
      headers.push(`References: ${options.inReplyTo}`);
    }

    const rawMessage = `${headers.join("\r\n")}\r\n\r\n${body}`;

    // Base64url encode
    const encoded = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const requestBody: any = { raw: encoded };
    if (options?.threadId) {
      requestBody.threadId = options.threadId;
    }

    const res = await fetch(`${GMAIL_API_BASE}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Send message failed:", error);
      throw new Error("Failed to send email via Gmail API");
    }

    const data = await res.json();
    return { id: data.id, threadId: data.threadId };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Parse a raw Gmail API message into our app's email format.
   */
  parseMessage(msg: GmailMessage): ParsedEmail {
    const getHeader = (name: string): string => {
      const header = msg.payload.headers.find(
        (h) => h.name.toLowerCase() === name.toLowerCase()
      );
      return header?.value || "";
    };

    const parseAddressField = (
      value: string
    ): Array<{ name?: string; address: string }> => {
      if (!value) return [];

      return value.split(",").map((part) => {
        const trimmed = part.trim();
        // Match: "Name" <email@example.com> or Name <email@example.com>
        const match = trimmed.match(
          /^(?:"?([^"]*)"?\s*)?<?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>?$/
        );
        if (match) {
          return {
            name: match[1]?.trim() || undefined,
            address: match[2] || trimmed,
          };
        }
        return { address: trimmed };
      });
    };

    // Extract body from parts
    const extractBody = (
      payload: GmailMessage["payload"]
    ): string => {
      // Direct body
      if (payload.body?.data) {
        return Buffer.from(payload.body.data, "base64url").toString("utf-8");
      }

      // Multi-part: prefer text/html, fallback to text/plain
      if (payload.parts) {
        // Recursively search for HTML part
        const htmlPart = this.findPart(payload.parts, "text/html");
        if (htmlPart?.body?.data) {
          return Buffer.from(htmlPart.body.data, "base64url").toString("utf-8");
        }

        const textPart = this.findPart(payload.parts, "text/plain");
        if (textPart?.body?.data) {
          return Buffer.from(textPart.body.data, "base64url").toString("utf-8");
        }
      }

      return "";
    };

    // Extract attachments
    const extractAttachments = (
      parts?: GmailMessagePart[]
    ): ParsedEmail["attachments"] => {
      if (!parts) return [];

      const attachments: ParsedEmail["attachments"] = [];
      for (const part of parts) {
        if (part.filename && part.filename.length > 0) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body?.size || 0,
            attachmentId: part.body?.attachmentId,
          });
        }
        if (part.parts) {
          attachments.push(...extractAttachments(part.parts));
        }
      }
      return attachments;
    };

    const labels = msg.labelIds || [];
    const sentDate = new Date(parseInt(msg.internalDate));
    const from = parseAddressField(getHeader("From"));

    return {
      id: msg.id,
      messageId: getHeader("Message-ID") || msg.id,
      threadId: msg.threadId,
      subject: getHeader("Subject") || "No Subject",
      body: extractBody(msg.payload),
      snippet: msg.snippet || "",
      from: from[0] || { address: "unknown@gmail.com" },
      to: parseAddressField(getHeader("To")),
      cc: parseAddressField(getHeader("Cc")),
      bcc: parseAddressField(getHeader("Bcc")),
      sentAt: sentDate,
      receivedAt: sentDate,
      isRead: !labels.includes("UNREAD"),
      isImportant: labels.includes("IMPORTANT"),
      isStarred: labels.includes("STARRED"),
      isDraft: labels.includes("DRAFT"),
      isSent: labels.includes("SENT"),
      attachments: extractAttachments(msg.payload.parts),
    };
  }

  /**
   * Recursively find a MIME part by type.
   */
  private findPart(
    parts: GmailMessagePart[],
    mimeType: string
  ): GmailMessagePart | null {
    for (const part of parts) {
      if (part.mimeType === mimeType) return part;
      if (part.parts) {
        const found = this.findPart(part.parts, mimeType);
        if (found) return found;
      }
    }
    return null;
  }
}

export const gmailApiClient = new GmailApiClient();
