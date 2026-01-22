import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Fallback narrative when no API key is available
function generateFallbackNarrative(
  patient: { firstName: string; lastName: string; dateOfBirth: string; insuranceProvider: string | null },
  diagnosis: { code: string; description: string },
  treatment: { code: string; name: string },
  ehrData: {
    diagnoses?: Array<{ code: string; description: string }>;
    medications?: Array<{ name: string; dose: string; frequency: string }>;
    labResults?: Array<{ test: string; result: string; date: string }>;
    medicalHistory?: Array<{ condition: string; year: number | null }>;
  }
): { narrative: string; strengthScore: number } {
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
  const currentMeds = ehrData.medications?.map((m) => `${m.name} ${m.dose}`).join(", ") || "None documented";
  const priorTreatments = ehrData.medicalHistory?.map((h) => h.condition).join(", ") || "None documented";
  const relevantLabs = ehrData.labResults?.slice(0, 3).map((l) => `${l.test}: ${l.result}`).join("; ") || "Pending";

  const narrative = `MEDICAL NECESSITY STATEMENT

Patient: ${patient.firstName} ${patient.lastName}
Date of Birth: ${patient.dateOfBirth} (Age: ${age})
Insurance: ${patient.insuranceProvider || "Not specified"}

DIAGNOSIS:
${diagnosis.code} - ${diagnosis.description}

REQUESTED TREATMENT:
${treatment.name} (CPT/HCPCS: ${treatment.code})

CLINICAL JUSTIFICATION:

1. DIAGNOSIS CONFIRMATION:
The patient has been diagnosed with ${diagnosis.description} (ICD-10: ${diagnosis.code}). This diagnosis has been confirmed through clinical evaluation and appropriate diagnostic testing.

2. CURRENT MEDICATIONS:
${currentMeds}

3. PRIOR TREATMENT HISTORY:
${priorTreatments}

4. RELEVANT LABORATORY/DIAGNOSTIC FINDINGS:
${relevantLabs}

5. MEDICAL NECESSITY:
The requested treatment (${treatment.name}) is medically necessary for the following reasons:
- The patient's condition requires intervention as documented by clinical findings
- Conservative or alternative treatments have been considered or attempted
- This treatment represents the standard of care for the documented diagnosis
- Without this treatment, the patient's condition may deteriorate or fail to improve

6. TREATMENT PLAN:
The proposed treatment plan includes ${treatment.name} as recommended by current clinical guidelines. The expected duration and frequency of treatment will be determined based on clinical response.

7. EXPECTED OUTCOMES:
With appropriate treatment, we anticipate improvement in the patient's condition and overall quality of life.

CONCLUSION:
Based on the clinical evidence presented, ${treatment.name} is medically necessary for this patient's condition. Approval of this prior authorization request is respectfully requested.

Submitted by: [Physician Name, MD]
Date: ${new Date().toLocaleDateString()}
`;

  // Calculate a basic strength score
  let strengthScore = 60;
  if (ehrData.labResults && ehrData.labResults.length > 0) strengthScore += 10;
  if (ehrData.medicalHistory && ehrData.medicalHistory.length > 0) strengthScore += 10;
  if (ehrData.medications && ehrData.medications.length > 0) strengthScore += 5;
  if (diagnosis.code.startsWith("C")) strengthScore += 10; // Oncology codes
  
  return { narrative, strengthScore: Math.min(95, strengthScore) };
}

export async function POST(request: Request) {
  const body = await request.json();
  const { patient, diagnosis, treatment, ehrData, riskScore } = body;

  // If OpenAI is configured, use it
  if (openai) {
    try {
      const prompt = `You are a medical documentation specialist helping physicians write prior authorization requests. Generate a compelling medical necessity statement for the following case:

Patient: ${patient.firstName} ${patient.lastName}, DOB: ${patient.dateOfBirth}
Insurance: ${patient.insuranceProvider}

Diagnosis: ${diagnosis.code} - ${diagnosis.description}
Requested Treatment: ${treatment.name} (Code: ${treatment.code})

Patient Medical History:
${JSON.stringify(ehrData.medicalHistory || [], null, 2)}

Current Medications:
${JSON.stringify(ehrData.medications || [], null, 2)}

Recent Lab Results:
${JSON.stringify(ehrData.labResults || [], null, 2)}

Current Risk Score Analysis:
- Approval Likelihood: ${riskScore?.score || "N/A"}%
- Positive Factors: ${riskScore?.positiveFactors?.join(", ") || "None identified"}
- Concerns: ${riskScore?.negativeFactors?.join(", ") || "None identified"}

Please write a comprehensive medical necessity statement that:
1. Clearly states the diagnosis and its severity
2. References relevant clinical guidelines (NCCN, ACC, ACR, etc. as appropriate)
3. Documents prior treatments if applicable
4. Explains why this specific treatment is necessary
5. Addresses common denial reasons proactively
6. Uses professional medical terminology

Format the response as a formal medical necessity letter.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const narrative = completion.choices[0]?.message?.content || "";
      
      // Calculate strength score based on content analysis
      let strengthScore = 70;
      if (narrative.toLowerCase().includes("guideline")) strengthScore += 10;
      if (narrative.toLowerCase().includes("nccn") || narrative.toLowerCase().includes("clinical guideline")) strengthScore += 5;
      if (narrative.toLowerCase().includes("medical necessity")) strengthScore += 5;
      if (narrative.toLowerCase().includes("prior treatment") || narrative.toLowerCase().includes("failed")) strengthScore += 5;
      if (narrative.length > 1500) strengthScore += 5;

      return NextResponse.json({
        narrative,
        strengthScore: Math.min(95, strengthScore),
      });
    } catch (error) {
      console.error("OpenAI API error:", error);
      // Fall back to generated narrative
      const fallback = generateFallbackNarrative(patient, diagnosis, treatment, ehrData);
      return NextResponse.json(fallback);
    }
  }

  // No API key - use fallback
  const fallback = generateFallbackNarrative(patient, diagnosis, treatment, ehrData);
  return NextResponse.json(fallback);
}
