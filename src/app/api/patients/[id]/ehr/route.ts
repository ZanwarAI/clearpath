import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ehrRecords } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const ehr = db
    .select()
    .from(ehrRecords)
    .where(eq(ehrRecords.patientId, id))
    .get();

  if (!ehr) {
    return NextResponse.json({ ehr: null });
  }

  // Parse JSON fields
  return NextResponse.json({
    ehr: {
      diagnoses: JSON.parse(ehr.diagnoses || "[]"),
      medications: JSON.parse(ehr.medications || "[]"),
      allergies: JSON.parse(ehr.allergies || "[]"),
      labResults: JSON.parse(ehr.labResults || "[]"),
      vitalSigns: JSON.parse(ehr.vitalSigns || "{}"),
      medicalHistory: JSON.parse(ehr.medicalHistory || "[]"),
    },
  });
}
