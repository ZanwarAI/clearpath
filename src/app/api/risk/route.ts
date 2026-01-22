import { NextResponse } from "next/server";
import { calculateRiskScore } from "@/lib/risk";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    diagnosisCode,
    treatmentCode,
    insuranceProvider,
    hasCompleteDocs,
    hasPriorTreatment,
    urgencyLevel,
    patientAge,
  } = body;

  const result = calculateRiskScore({
    diagnosisCode,
    treatmentCode,
    insuranceProvider: insuranceProvider || "Unknown",
    hasCompleteDocs: hasCompleteDocs ?? true,
    hasPriorTreatment: hasPriorTreatment ?? false,
    urgencyLevel: urgencyLevel || "routine",
    patientAge,
  });

  return NextResponse.json(result);
}
