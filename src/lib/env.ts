import { z } from "zod";

/**
 * Server-side environment validation.
 * Fails fast with clear messages if required secrets are missing or invalid.
 * Never logs actual secret values.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Firebase Admin (server only)
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().optional(),

  // Database
  DATABASE_URL: z.string().min(1).optional(),

  // Session
  SESSION_SECRET: z.string().min(32).optional(),

  // AI
  AI_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  AI_PROVIDER: z.enum(["off", "groq", "openrouter"]).default("off"),
  AI_MODEL: z.string().optional(),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1).max(4096).default(512),
  AI_FREE_ONLY: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  AI_ALLOW_PAID_MODELS: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),

  // Storage
  STORAGE_PROVIDER: z.enum(["local", "neon"]).default("local"),
  UPLOAD_MAX_BYTES: z.coerce.number().default(10_485_760),

  // Payments
  PAYMENT_PROVIDER: z.enum(["mock"]).default("mock"),
  PAYMENTS_LIVE_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

function validateEnv() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid server environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration. Check .env.local against .env.example");
  }
  return parsed.data;
}

// Lazy validation – only runs when first imported on server
let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must only be called on the server");
  }
  if (!cached) {
    cached = validateEnv();
  }
  return cached;
}

export function getClientFirebaseConfig() {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  });

  if (!result.success) {
    return null;
  }

  const c = result.data;
  if (!c.NEXT_PUBLIC_FIREBASE_API_KEY || !c.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return null;
  }

  return {
    apiKey: c.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: c.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: c.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: c.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: c.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: c.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: c.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

/** Returns true if Firebase client config is present (not placeholders) */
export function isFirebaseConfigured(): boolean {
  const config = getClientFirebaseConfig();
  if (!config) return false;
  return !config.apiKey.includes("REPLACE_ME") && !config.projectId.includes("REPLACE_ME");
}
