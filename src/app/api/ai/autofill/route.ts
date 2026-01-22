import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ehrRecords, patients } from "@/lib/schema";
import { getLoggedInUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface AutofillSuggestion {
  diagnosisCode: string | null;
  diagnosisDescription: string | null;
  treatmentSuggestions: string[];
  urgencyLevel: string;
  clinicalNotes: string;
}

// Generate fallback autofill suggestions from EHR data
function generateFallbackAutofill(
  ehrData: {
    diagnoses?: Array<{ code: string; description: string }>;
    medications?: Array<{ name: string; dose: string }>;
    medicalHistory?: Array<{ condition: string }>;
  },
  patient: { firstName: string; lastName: string; insuranceProvider: string | null }
): AutofillSuggestion {
  // Use primary diagnosis from EHR if available
  const primaryDiagnosis = ehrData.diagnoses?.[0] || null;

  // Generate treatment suggestions based on diagnosis
  const treatmentSuggestions: string[] = [];
  if (primaryDiagnosis) {
    const code = primaryDiagnosis.code.toUpperCase();

    // Oncology suggestions (C codes)
    if (code.startsWith("C")) {
      treatmentSuggestions.push("Immunotherapy (Pembrolizumab/Keytruda)");
      treatmentSuggestions.push("Targeted therapy");
      treatmentSuggestions.push("PET/CT imaging for staging");
    }
    // Rheumatology suggestions (M codes)
    else if (code.startsWith("M")) {
      treatmentSuggestions.push("Biologic therapy (Adalimumab/Humira)");
      treatmentSuggestions.push("Physical therapy");
      treatmentSuggestions.push("Joint imaging (MRI)");
    }
    // Cardiology suggestions (I codes)
    else if (code.startsWith("I")) {
      treatmentSuggestions.push("Cardiac catheterization");
      treatmentSuggestions.push("Echocardiogram");
      treatmentSuggestions.push("Cardiac rehabilitation");
    }
    // Default suggestions
    else {
      treatmentSuggestions.push("Diagnostic imaging");
      treatmentSuggestions.push("Specialist consultation");
      treatmentSuggestions.push("Laboratory workup");
    }
  }

  // Determine urgency based on diagnosis
  let urgencyLevel = "routine";
  if (primaryDiagnosis?.code.startsWith("C")) {
    urgencyLevel = "urgent";
  }

  // Generate clinical notes summary
  const medicationList = ehrData.medications?.map((m) => m.name).join(", ") || "None";
  const historyList = ehrData.medicalHistory?.map((h) => h.condition).join(", ") || "None";

  const clinicalNotes = `Patient: ${patient.firstName} ${patient.lastName}
Insurance: ${patient.insuranceProvider || "Not specified"}

Current Medications: ${medicationList}
Medical History: ${historyList}

${primaryDiagnosis ? `Primary Diagnosis: ${primaryDiagnosis.code} - ${primaryDiagnosis.description}` : "No diagnosis on file"}`;

  return {
    diagnosisCode: primaryDiagnosis?.code || null,
    diagnosisDescription: primaryDiagnosis?.description || null,
    treatmentSuggestions,
    urgencyLevel,
    clinicalNotes,
  };
}

export async function POST(request: Request) {
  const user = await getLoggedInUser();

  if (!user || user.role !== "physician") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { patientId } = body;

  if (!patientId) {
    return NextResponse.json(
      { error: "Missing required field: patientId" },
      { status: 400 }
    );
  }

  // Get patient info
  const patient = db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))
    .get();

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Get EHR data
  const ehr = db
    .select()
    .from(ehrRecords)
    .where(eq(ehrRecords.patientId, patientId))
    .get();

  const ehrData = ehr
    ? {
        diagnoses: JSON.parse(ehr.diagnoses || "[]"),
        medications: JSON.parse(ehr.medications || "[]"),
        allergies: JSON.parse(ehr.allergies || "[]"),
        labResults: JSON.parse(ehr.labResults || "[]"),
        vitalSigns: JSON.parse(ehr.vitalSigns || "{}"),
        medicalHistory: JSON.parse(ehr.medicalHistory || "[]"),
      }
    : {};

  // If OpenAI is configured, use it for smarter suggestions
  if (openai) {
    try {
      const prompt = `Based on the following patient EHR data, suggest appropriate prior authorization form values:

Patient: ${patient.firstName} ${patient.lastName}
Insurance: ${patient.insuranceProvider || "Not specified"}

EHR Data:
${JSON.stringify(ehrData, null, 2)}

Please respond with a JSON object containing:
{
  "diagnosisCode": "most relevant ICD-10 code",
  "diagnosisDescription": "diagnosis description",
  "treatmentSuggestions": ["array of 3-5 recommended treatments"],
  "urgencyLevel": "routine|urgent|emergent",
  "clinicalNotes": "brief clinical summary for the PA form"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      const suggestions = JSON.parse(responseText) as AutofillSuggestion;

      return NextResponse.json({
        suggestions,
        patient: {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          insuranceProvider: patient.insuranceProvider,
        },
        ehrSummary: {
          diagnosisCount: ehrData.diagnoses?.length || 0,
          medicationCount: ehrData.medications?.length || 0,
          hasLabResults: (ehrData.labResults?.length || 0) > 0,
        },
      });
    } catch (error) {
      console.error("OpenAI API error:", error);
      // Fall through to fallback
    }
  }

  // Fallback: Generate suggestions without AI
  const suggestions = generateFallbackAutofill(ehrData, {
    firstName: patient.firstName,
    lastName: patient.lastName,
    insuranceProvider: patient.insuranceProvider,
  });

  return NextResponse.json({
    suggestions,
    patient: {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      insuranceProvider: patient.insuranceProvider,
    },
    ehrSummary: {
      diagnosisCount: ehrData.diagnoses?.length || 0,
      medicationCount: ehrData.medications?.length || 0,
      hasLabResults: (ehrData.labResults?.length || 0) > 0,
    },
  });
}
