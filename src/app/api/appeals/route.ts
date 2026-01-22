import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appeals, priorAuthorizations, notifications, patients } from "@/lib/schema";
import { getLoggedInUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const user = await getLoggedInUser();

  if (!user || user.role !== "physician") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    paId,
    appealLevel,
    appealReason,
    appealNarrative,
    additionalEvidence,
  } = body;

  // Validate required fields
  if (!paId || !appealLevel || !appealReason) {
    return NextResponse.json(
      { error: "Missing required fields: paId, appealLevel, appealReason" },
      { status: 400 }
    );
  }

  // Verify the PA exists and is denied
  const pa = db
    .select()
    .from(priorAuthorizations)
    .where(eq(priorAuthorizations.id, paId))
    .get();

  if (!pa) {
    return NextResponse.json({ error: "Prior authorization not found" }, { status: 404 });
  }

  if (pa.status !== "complete" || pa.statusDetail !== "denied") {
    return NextResponse.json(
      { error: "Can only appeal denied prior authorizations" },
      { status: 400 }
    );
  }

  const appealId = uuidv4();
  const now = new Date().toISOString();

  // Calculate deadline (typically 30-60 days from denial)
  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 30);

  // Create the appeal
  db.insert(appeals)
    .values({
      id: appealId,
      paId,
      appealLevel: appealLevel as number,
      status: "submitted",
      appealReason,
      additionalEvidence: additionalEvidence ? JSON.stringify(additionalEvidence) : null,
      appealNarrative: appealNarrative || null,
      p2pScheduled: 0,
      p2pDate: null,
      p2pNotes: null,
      reviewerName: null,
      reviewerSpecialty: null,
      outcome: null,
      outcomeReason: null,
      deadlineDate: deadlineDate.toISOString(),
      submittedAt: now,
      decidedAt: null,
      createdAt: now,
    })
    .run();

  // Get patient info for notification
  if (pa.patientId) {
    const patient = db
      .select()
      .from(patients)
      .where(eq(patients.id, pa.patientId))
      .get();

    // Create notification for patient
    if (patient && patient.userId) {
      db.insert(notifications)
        .values({
          id: uuidv4(),
          userId: patient.userId,
          patientId: pa.patientId,
          paId,
          type: "status_change",
          title: "Appeal Submitted",
          message: `An appeal has been submitted for your ${pa.treatmentName} prior authorization.`,
          channel: "email",
          read: 0,
          sentAt: now,
          createdAt: now,
        })
        .run();
    }
  }

  return NextResponse.json({ id: appealId, success: true });
}

export async function GET() {
  const user = await getLoggedInUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all appeals with their PA info
  const allAppeals = db
    .select({
      appeal: appeals,
      pa: priorAuthorizations,
    })
    .from(appeals)
    .innerJoin(priorAuthorizations, eq(appeals.paId, priorAuthorizations.id))
    .all();

  // Filter based on role
  let filteredAppeals = allAppeals;
  if (user.role === "physician") {
    filteredAppeals = allAppeals.filter((a) => a.pa.physicianId === user.id);
  } else if (user.role === "patient" && user.patientId) {
    filteredAppeals = allAppeals.filter((a) => a.pa.patientId === user.patientId);
  }

  return NextResponse.json({
    appeals: filteredAppeals.map((a) => ({
      ...a.appeal,
      treatmentName: a.pa.treatmentName,
      patientId: a.pa.patientId,
      diagnosisCode: a.pa.diagnosisCode,
      diagnosisDescription: a.pa.diagnosisDescription,
    })),
  });
}
