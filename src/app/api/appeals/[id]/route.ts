import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appeals, priorAuthorizations, patients, notifications } from "@/lib/schema";
import { getLoggedInUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getLoggedInUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appeal = db.select().from(appeals).where(eq(appeals.id, id)).get();

  if (!appeal) {
    return NextResponse.json({ error: "Appeal not found" }, { status: 404 });
  }

  // Get associated PA
  const pa = appeal.paId
    ? db.select().from(priorAuthorizations).where(eq(priorAuthorizations.id, appeal.paId)).get()
    : null;

  // Get patient info
  const patient = pa?.patientId
    ? db.select().from(patients).where(eq(patients.id, pa.patientId)).get()
    : null;

  // Authorization check
  if (user.role === "physician" && pa?.physicianId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (user.role === "patient" && pa?.patientId !== user.patientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({
    appeal: {
      ...appeal,
      additionalEvidence: appeal.additionalEvidence
        ? JSON.parse(appeal.additionalEvidence)
        : [],
    },
    pa: pa
      ? {
          ...pa,
          riskFactorsPositive: pa.riskFactorsPositive
            ? JSON.parse(pa.riskFactorsPositive)
            : [],
          riskFactorsNegative: pa.riskFactorsNegative
            ? JSON.parse(pa.riskFactorsNegative)
            : [],
          riskImprovementSuggestions: pa.riskImprovementSuggestions
            ? JSON.parse(pa.riskImprovementSuggestions)
            : [],
        }
      : null,
    patient,
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getLoggedInUser();

  if (!user || user.role !== "physician") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appeal = db.select().from(appeals).where(eq(appeals.id, id)).get();

  if (!appeal) {
    return NextResponse.json({ error: "Appeal not found" }, { status: 404 });
  }

  // Get PA for authorization check
  const pa = appeal.paId
    ? db.select().from(priorAuthorizations).where(eq(priorAuthorizations.id, appeal.paId)).get()
    : null;

  if (pa?.physicianId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const {
    status,
    appealReason,
    appealNarrative,
    additionalEvidence,
    p2pScheduled,
    p2pDate,
    p2pNotes,
    outcome,
    outcomeReason,
  } = body;

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {};

  if (status !== undefined) updates.status = status;
  if (appealReason !== undefined) updates.appealReason = appealReason;
  if (appealNarrative !== undefined) updates.appealNarrative = appealNarrative;
  if (additionalEvidence !== undefined)
    updates.additionalEvidence = JSON.stringify(additionalEvidence);
  if (p2pScheduled !== undefined) updates.p2pScheduled = p2pScheduled ? 1 : 0;
  if (p2pDate !== undefined) updates.p2pDate = p2pDate;
  if (p2pNotes !== undefined) updates.p2pNotes = p2pNotes;
  if (outcome !== undefined) {
    updates.outcome = outcome;
    updates.decidedAt = now;
  }
  if (outcomeReason !== undefined) updates.outcomeReason = outcomeReason;

  // Update the appeal
  db.update(appeals)
    .set(updates)
    .where(eq(appeals.id, id))
    .run();

  // Create notification for patient on status changes
  if (status && pa?.patientId) {
    const patient = db
      .select()
      .from(patients)
      .where(eq(patients.id, pa.patientId))
      .get();

    if (patient?.userId) {
      let title = "Appeal Update";
      let message = `Your appeal for ${pa.treatmentName} has been updated.`;

      if (outcome === "overturned") {
        title = "Appeal Approved";
        message = `Great news! Your appeal for ${pa.treatmentName} has been approved.`;
      } else if (outcome === "upheld") {
        title = "Appeal Denied";
        message = `Unfortunately, your appeal for ${pa.treatmentName} was not successful.`;
      } else if (p2pScheduled) {
        title = "P2P Review Scheduled";
        message = `A peer-to-peer review has been scheduled for your ${pa.treatmentName} appeal.`;
      }

      db.insert(notifications)
        .values({
          id: uuidv4(),
          userId: patient.userId,
          patientId: pa.patientId,
          paId: pa.id,
          type: "status_change",
          title,
          message,
          channel: "email",
          read: 0,
          sentAt: now,
          createdAt: now,
        })
        .run();
    }
  }

  // Fetch updated appeal
  const updatedAppeal = db.select().from(appeals).where(eq(appeals.id, id)).get();

  return NextResponse.json({ appeal: updatedAppeal, success: true });
}
