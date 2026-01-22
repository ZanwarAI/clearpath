import { cookies } from "next/headers";
import { db } from "./db";
import { users, patients } from "./schema";
import { eq } from "drizzle-orm";

const AUTH_COOKIE = "clearpath_user_id";

export type UserRole = "patient" | "physician" | "admin";

export interface LoggedInUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organization: string | null;
  patientId?: string; // Only set if role is 'patient'
}

export async function getLoggedInUser(): Promise<LoggedInUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(AUTH_COOKIE)?.value;

  if (!userId) {
    return null;
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) {
    return null;
  }

  let patientId: string | undefined;
  if (user.role === "patient") {
    const patient = db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId))
      .get();
    patientId = patient?.id;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as UserRole,
    organization: user.organization,
    patientId,
  };
}

// Legacy function for backward compatibility with patient pages
export async function getLoggedInPatient() {
  const user = await getLoggedInUser();
  
  if (!user || user.role !== "patient" || !user.patientId) {
    return null;
  }

  const patient = db
    .select()
    .from(patients)
    .where(eq(patients.id, user.patientId))
    .get();

  return patient || null;
}

export async function login(email: string) {
  const user = db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (!user) {
    return null;
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return user;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export function getPatientById(id: string) {
  return db.select().from(patients).where(eq(patients.id, id)).get();
}

export function getUserById(id: string) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function getPatientByUserId(userId: string) {
  return db.select().from(patients).where(eq(patients.userId, userId)).get();
}

// Role guard helpers
export async function requireRole(allowedRoles: UserRole[]): Promise<LoggedInUser> {
  const user = await getLoggedInUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requirePhysician(): Promise<LoggedInUser> {
  return requireRole(["physician"]);
}

export async function requireAdmin(): Promise<LoggedInUser> {
  return requireRole(["admin"]);
}

export async function requirePatient(): Promise<LoggedInUser> {
  return requireRole(["patient"]);
}
