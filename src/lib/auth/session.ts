/**
 * Server-side session helpers.
 * Identity comes from Firebase ID token (Authorization: Bearer <token>).
 * Roles are ALWAYS read from the internal database – never from client claims.
 */

import { verifyIdToken } from "./firebase-admin";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  roles: Role[];
};

/**
 * Resolve the current user from a Bearer token.
 * Returns null if unauthenticated or token invalid.
 * Creates the internal User row on first login (customer role by default).
 */
export async function getSessionUser(
  authorizationHeader: string | null
): Promise<SessionUser | null> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authorizationHeader.slice(7).trim();
  if (!idToken) return null;

  const decoded = await verifyIdToken(idToken);
  if (!decoded?.uid) return null;
  // Phone sign-in has no email: use a stable placeholder so the account still works.
  const userEmail =
    decoded.email ??
    `${(decoded.phone_number ?? decoded.uid).replace(/[^0-9a-zA-Z]/g, "")}@phone.shopngo.app`;

  if (!isDatabaseConfigured() || !prisma) {
    // Database not ready – return a minimal ephemeral session (dev only)
    return {
      id: "ephemeral",
      firebaseUid: decoded.uid,
      email: userEmail,
      displayName: decoded.name ?? null,
      roles: ["CUSTOMER"],
    };
  }

  // Owners listed in ADMIN_EMAILS get admin and moderator access on sign-in.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isBootstrapAdmin =
    Boolean(decoded.email) &&
    decoded.email_verified !== false &&
    adminEmails.includes(userEmail.toLowerCase());

  // Upsert internal user – idempotent
  const upserted = await prisma.user.upsert({
    where: { firebaseUid: decoded.uid },
    // Only the email is refreshed: name and photo are the member's own edits after sign-up.
    update: decoded.email ? { email: decoded.email } : {},
    create: {
      firebaseUid: decoded.uid,
      email: userEmail,
      displayName: decoded.name ?? decoded.phone_number ?? null,
      photoUrl: decoded.picture ?? null,
      roles: isBootstrapAdmin ? ["CUSTOMER", "ADMIN", "MODERATOR"] : ["CUSTOMER"],
    },
    select: {
      id: true,
      firebaseUid: true,
      email: true,
      displayName: true,
      roles: true,
    },
  });

  if (isBootstrapAdmin && !upserted.roles.includes("ADMIN")) {
    const roles = Array.from(new Set([...upserted.roles, "ADMIN", "MODERATOR"])) as Role[];
    const promoted = await prisma.user.update({
      where: { id: upserted.id },
      data: { roles },
      select: { id: true, firebaseUid: true, email: true, displayName: true, roles: true },
    });
    return promoted;
  }

  return upserted;
}

/** Require an authenticated user or throw a structured error */
export async function requireUser(
  authorizationHeader: string | null
): Promise<SessionUser> {
  const user = await getSessionUser(authorizationHeader);
  if (!user) {
    const err = new Error("Unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return user;
}

/** Require at least one of the given roles */
export async function requireRole(
  authorizationHeader: string | null,
  allowed: Role[]
): Promise<SessionUser> {
  const user = await requireUser(authorizationHeader);
  const hasRole = user.roles.some((r) => allowed.includes(r));
  if (!hasRole) {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return user;
}

/** Client cannot elevate roles – this is the only place roles are read */
export function hasRole(user: SessionUser, role: Role): boolean {
  return user.roles.includes(role);
}
