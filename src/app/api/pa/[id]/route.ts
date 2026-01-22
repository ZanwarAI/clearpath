import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priorAuthorizations, patients } from "@/lib/schema";
import { getLoggedInUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getLoggedInUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pa = db
    .select()
    .from(priorAuthorizations)
    .where(eq(priorAuthorizations.id, id))
    .get();

  if (!pa) {
    return NextResponse.json({ error: "Prior authorization not found" }, { status: 404 });
  }

  // Authorization check
  if (user.role === "physician" && pa.physicianId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (user.role === "patient" && pa.patientId !== user.patientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get patient info
  const patient = pa.patientId
    ? db.select().from(patients).where(eq(patients.id, pa.patientId)).get()
    : null;

  return NextResponse.json({
    pa: {
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
    },
    patient,
  });
}
