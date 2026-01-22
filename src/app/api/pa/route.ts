import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priorAuthorizations, notifications, patients } from "@/lib/schema";
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
    patientId,
    diagnosisCode,
    diagnosisDescription,
    treatmentCode,
    treatmentName,
    riskScore,
    riskScoreConfidenceLow,
    riskScoreConfidenceHigh,
    riskFactorsPositive,
    riskFactorsNegative,
    riskImprovementSuggestions,
    historicalApprovalRate,
    estimatedCompletionDays,
    physicianNotes,
    aiNarrative,
    aiNarrativeStrength,
  } = body;

  const paId = uuidv4();
  const now = new Date().toISOString();

  // Create the PA
  db.insert(priorAuthorizations)
    .values({
      id: paId,
      patientId,
      physicianId: user.id,
      submittedByUserId: user.id,
      treatmentName,
      treatmentCode,
      diagnosisCode,
      diagnosisDescription,
      status: "submitted",
      statusDetail: null,
      riskScore,
      riskScoreConfidenceLow,
      riskScoreConfidenceHigh,
      riskFactorsPositive: JSON.stringify(riskFactorsPositive || []),
      riskFactorsNegative: JSON.stringify(riskFactorsNegative || []),
      riskImprovementSuggestions: JSON.stringify(riskImprovementSuggestions || []),
      historicalApprovalRate,
      physicianNotes,
      aiNarrative,
      aiNarrativeStrength,
      aiAutofillData: null,
      denialReason: null,
      estimatedCompletionDays,
      submittedAt: now,
      decisionAt: null,
      updatedAt: now,
    })
    .run();

  // Get patient info for notification
  const patient = db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))
    .get();

  // Create notification for patient
  if (patient && patient.userId) {
    db.insert(notifications)
      .values({
        id: uuidv4(),
        userId: patient.userId,
        patientId,
        paId,
        type: "status_change",
        title: "New PA Submitted",
        message: `A prior authorization request for ${treatmentName} has been submitted on your behalf.`,
        channel: "email",
        read: 0,
        sentAt: now,
        createdAt: now,
      })
      .run();
  }

  return NextResponse.json({ id: paId, success: true });
}
