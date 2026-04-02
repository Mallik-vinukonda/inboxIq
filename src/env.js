import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Clerk
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().min(1),

    // Google Gemini AI - Multiple Keys for Higher Quota
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
    GOOGLE_GENERATIVE_AI_API_KEY_2: z.string().optional(),
    GOOGLE_GENERATIVE_AI_API_KEY_3: z.string().optional(),

    // OpenAI API (alternative to Gemini)
    OPENAI_API_KEY: z.string().optional(),

    // Resend Email API (for sending emails)
    RESEND_API_KEY: z.string().optional(),

    // Gmail SMTP (alternative for sending emails)
    GMAIL_USER: z.string().email().optional(),
    GMAIL_APP_PASSWORD: z.string().optional(),

    // Google OAuth 2.0 (for Gmail API)
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),

    // Token encryption (64 hex chars = 32 bytes for AES-256-GCM)
    TOKEN_ENCRYPTION_KEY: z.string().length(64).optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,

    // Clerk
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,

    // Google Gemini AI - Multiple Keys
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY_2: process.env.GOOGLE_GENERATIVE_AI_API_KEY_2,
    GOOGLE_GENERATIVE_AI_API_KEY_3: process.env.GOOGLE_GENERATIVE_AI_API_KEY_3,

    // OpenAI API
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    // Resend Email API
    RESEND_API_KEY: process.env.RESEND_API_KEY,

    // Gmail SMTP
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,

    // Google OAuth 2.0
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    // Token Encryption
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,

    // App
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});